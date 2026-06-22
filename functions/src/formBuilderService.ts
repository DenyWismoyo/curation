// functions/src/formBuilderService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { buildMegaAgentPrompt } from "./promt/formBuilderPrompt";
import { buildAIConfigPrompt } from "./promt/aiConfigPrompt";
import { storeTemplateResearchVector } from "./vectorService";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const cleanUndefinedAndNull = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(cleanUndefinedAndNull).filter(v => v != null);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v != null && v !== "") 
        .map(([k, v]) => [k, cleanUndefinedAndNull(v)])
    );
  }
  return obj;
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    console.warn(`⏳ API Gemini sibuk, mencoba ulang... (${retries} percobaan tersisa)`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

// Fungsi pembantu untuk mengekstrak JSON dari response yang mungkin mengandung teks tambahan/markdown
const extractJSONFromText = (rawText: string): any => {
  let cleanedText = rawText.trim();
  // Coba cari pola markdown JSON ```json ... ```
  const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleanedText = jsonMatch[1].trim();
  } else {
    // Bersihkan jika ada sisa backtick
    cleanedText = cleanedText.replace(/```/g, '').trim();
  }
  
  // Membersihkan control character (seperti enter harfiah) agar tidak membuat JSON.parse crash.
  cleanedText = cleanedText.replace(/[\u0000-\u0019]+/g, " "); 
  
  return JSON.parse(cleanedText);
};

// ============================================================================
// FUNGSI 1: MEMBANGUN FORMULIR BERDASARKAN CONFIG (SKALA ENTERPRISE AMAN)
// ============================================================================
export const generateFormTemplateFromAI = onCall(
  { 
    memory: "2GiB", 
    timeoutSeconds: 540, 
    region: "asia-southeast2", 
    secrets: [geminiApiKeySecret], 
    cors: true 
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Silakan login terlebih dahulu.");
    
    const data = request.data as any;
    const { templateId, trackName, aiPromptConfig, archetypeInstruction } = data;

    if (!templateId) {
      throw new HttpsError("invalid-argument", "ID Template wajib disertakan untuk manajemen auto-save latar belakang.");
    }

    const db = getFirestore(admin.app(), "curation");
    const templateRef = db.collection("form_templates").doc(templateId);

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      await templateRef.update({
        aiGenerationStatus: {
          phase: "BUILDING_FORM",
          message: "AI sedang melakukan Deep Research sekaligus merancang instrumen audit...",
          updatedAt: new Date().toISOString()
        }
      });

      const architectModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        tools: [{ googleSearch: {} } as any], 
        generationConfig: {
          temperature: 0.6, 
          maxOutputTokens: 8192
          // responseMimeType dihapus karena tidak bisa digunakan bersama googleSearch
        }
      });

      const promptParams = {
        trackName: trackName || "Asesmen Umum",
        config: aiPromptConfig || {},
        archetypeInstruction: archetypeInstruction || ""
      };

      let finalPrompt = buildMegaAgentPrompt(promptParams);
      
      finalPrompt += `
      
      ==================================================
      🚨 PROTOKOL ASESMEN KELAS ENTERPRISE & BATAS TOKEN (MUTLAK) 🚨
      ==================================================
      1. [SKALA & KEDALAMAN]: Jangan membuat kuesioner yang dangkal. Buatlah instrumen audit mendalam yang mengeskplorasi operasional, finansial, dan risiko.
      2. [STUDI KASUS & SKENARIO]: Gunakan pertanyaan berbasis skenario/psikometri untuk mendeteksi insting peserta.
      3. [RICH PLACEHOLDERS]: Untuk pertanyaan bertipe 'text', 'textarea', atau 'number', WAJIB menyediakan properti "placeholder" yang berisi contoh aktual jawaban.
      4. [AGRESIF CONDITIONAL LOGIC]: Rangkai alur bercabang (showIf) secara cerdas. Jika pengguna memilih opsi 'Risiko Tinggi', munculkan field 'textarea' untuk justifikasi. Pastikan "showIf" merujuk ke ID pertanyaan SEBELUMNYA, DILARANG merujuk ke dirinya sendiri.
      5. [OUTPUT LIMITATION]: BATAS OUTPUT TOKEN API ADALAH 8192. Anda HARUS meringkas total pertanyaan di seluruh form menjadi MAKSIMAL 30-35 pertanyaan saja untuk menghindari error JSON terpotong (Unexpected end of JSON input). Efisiensikan penggunaan kata pada 'options' dan 'description'.
      6. [JSON SCHEMA INSTRUCTION]: Pastikan output JSON murni memiliki struktur dengan key "researchNotes" (string) dan "steps" (array of objects sesuai definisi di atas).
      `;

      console.log(`🏗️ [${templateId}] Merakit struktur form JSON berskala masif dengan Live Web Search...`);
      const result = await withRetry(() => architectModel.generateContent(finalPrompt));
      
      const parsedObject = extractJSONFromText(result.response.text());

      if (parsedObject.researchNotes) {
        await storeTemplateResearchVector(templateId, trackName, parsedObject.researchNotes, API_KEY)
          .catch(e => console.error("Gagal merekam vector research formulir:", e));
      }

      const finalStepsArray = parsedObject.steps || [];
      if (!Array.isArray(finalStepsArray) || finalStepsArray.length === 0) {
        throw new Error("Objek JSON berhasil terbentuk, tetapi array 'steps' kosong.");
      }

      const cleanedSteps = cleanUndefinedAndNull(finalStepsArray);

      await templateRef.update({
        steps: cleanedSteps,
        version: admin.firestore.FieldValue.increment(1),
        lastUpdated: new Date().toISOString(),
        aiGenerationStatus: {
          phase: "COMPLETED",
          message: "Formulir berstandar Enterprise berhasil dibuat dan disimpan otomatis!",
          updatedAt: new Date().toISOString()
        }
      });

      console.log(`✅ [${templateId}] Auto-Save dan Vector Database Sukses Berjalan!`);
      return { success: true, steps: cleanedSteps };

    } catch (error: any) {
      console.error(`💥 Fatal Error pada Latar Belakang Template [${templateId}]:`, error);
      await templateRef.update({
        aiGenerationStatus: {
          phase: "FAILED",
          message: `Kendala AI: ${error.message || "Gagal memproses struktur data formulir."}`,
          updatedAt: new Date().toISOString()
        }
      });
      throw new HttpsError("internal", error.message || "Gagal memproses analisis AI.");
    }
  }
);


// ============================================================================
// FUNGSI 2: AI CONFIGURATION ENHANCER (META-PROMPTING) & VECTOR RAG ENRICHMENT
// ============================================================================
export const generateAIConfigResearch = onCall(
  { 
    memory: "1GiB", 
    timeoutSeconds: 300, 
    region: "asia-southeast2", 
    secrets: [geminiApiKeySecret], 
    cors: true 
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const data = request.data as any;
    const { templateId, trackName, customTopic, currentConfig } = data; 
    const topicToResearch = customTopic || trackName || "Asesmen Bisnis Umum";
    const safeTemplateId = templateId || `research_config_${Date.now()}`;

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro", 
        tools: [{ googleSearch: {} } as any], 
        generationConfig: {
          temperature: 0.4, 
          maxOutputTokens: 8192
        }
      });

      const hasExistingConfig = currentConfig && Object.keys(currentConfig).length > 0 && 
                                (currentConfig.expectedMetrics?.length > 0 || currentConfig.assessmentGoal);

      const systemPrompt = buildAIConfigPrompt({
        trackName,
        topicToResearch,
        currentConfig,
        hasExistingConfig
      });

      const result = await withRetry(() => model.generateContent(systemPrompt));
      
      const parsedConfig = extractJSONFromText(result.response.text());

      await storeTemplateResearchVector(safeTemplateId, `Config Research: ${topicToResearch}`, JSON.stringify(parsedConfig), API_KEY)
         .catch(e => console.error(`Gagal merekam Vector Config Research untuk Template [${safeTemplateId}]:`, e));

      return { success: true, aiPromptConfig: parsedConfig };

    } catch (error: any) {
      console.error("Gagal melakukan Auto-Research AI Config:", error);
      throw new HttpsError("internal", error.message || "Gagal melakukan auto-research.");
    }
  }
);