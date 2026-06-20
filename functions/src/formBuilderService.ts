// functions/src/formBuilderService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

// withRetry diperkuat agar tidak mengulang (retry) jika error mutlak (seperti Safety Block / 400)
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

// ============================================================================
// FUNGSI 1: MEMBANGUN FORMULIR BERDASARKAN CONFIG (SINGLE-PASS GENERATION)
// ============================================================================
export const generateFormTemplateFromAI = onCall(
  { 
    memory: "2GiB", 
    timeoutSeconds: 300, 
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
          message: "AI sedang melakukan Deep Research sekaligus merancang struktur form dan skoring matriks...",
          updatedAt: new Date().toISOString()
        }
      });

      // MENGGUNAKAN FLASH DENGAN KONFIGURASI JSON NATIVE YANG LEBIH STABIL
      const architectModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        generationConfig: {
          temperature: 0.5, // Dikembalikan ke 0.5 agar output kuesioner lebih komprehensif dan maksimal
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
          // KITA MENGHAPUS responseSchema KARENA SCHEMA BERSARANG (NESTED) MEMBUAT AI BUG SYNTAX
        }
      });

      const promptParams = {
        trackName: trackName || "Asesmen Umum",
        config: aiPromptConfig || {},
        archetypeInstruction: archetypeInstruction || ""
      };

      let finalPrompt = buildMegaAgentPrompt(promptParams);
      // KITA INJEKSIKAN PERINTAH KETAT AGAR STRUKTUR JSON SEMPURNA
      finalPrompt += `
      
      ==================================================
      🚨 ATURAN KETAT JSON (MUTLAK) 🚨
      ==================================================
      1. OUTPUT WAJIB BERUPA JSON MURNI TANPA MARKDOWN BACKTICKS (\`\`\`json).
      2. SELURUH NAMA PROPERTI/KEY WAJIB MENGGUNAKAN TANDA KUTIP GANDA (Contoh: "label": "Nama"). DILARANG KERAS menggunakan unquoted keys (seperti label: "Nama").
      3. DILARANG meninggalkan trailing comma (koma di akhir array/objek sebelum tanda tutup).
      4. Hasilkan kuesioner pertanyaan formulir yang komprehensif, mendalam, dan selengkap mungkin (Output Maksimal).
      `;

      console.log(`🏗️ [${templateId}] Merakit struktur form JSON menggunakan Gemini 2.5 Flash...`);
      const result = await withRetry(() => architectModel.generateContent(finalPrompt));
      
      let rawText = result.response.text().trim();
      
      // PEMBERSIHAN MARKDOWN BACKTICKS
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/```/g, '').trim();
      }
      
      // 🔥 AUTO-FIXER: Mengoreksi bug syntax JSON yang sering dilakukan mesin AI secara otomatis
      rawText = rawText.replace(/,\s*([\]}])/g, '$1'); // Menghapus koma gantung (trailing comma) di akhir elemen
      rawText = rawText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // Memaksa tanda kutip ganda pada key yang luput diketik AI

      const parsedObject = JSON.parse(rawText);

      // 1. SIMPAN HASIL RISET (researchNotes) KE VECTOR DATABASE UNTUK MASA DEPAN
      if (parsedObject.researchNotes) {
        console.log(`📚 [${templateId}] Mengekstrak researchNotes dan menyimpannya ke Vector Database...`);
        await storeTemplateResearchVector(templateId, trackName, parsedObject.researchNotes, API_KEY)
          .catch(e => console.error("Gagal merekam vector research formulir:", e));
      }

      // 2. BERSIHKAN & SIMPAN STRUKTUR FORMULIR
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
// ============================================================================
// FUNGSI 2: AI CONFIGURATION ENHANCER (META-PROMPTING) & VECTOR RAG ENRICHMENT
// ============================================================================
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
      // MENGGUNAKAN FLASH 2.5 + STRICT SCHEMA & PENAHAN HALUSINASI PANJANG TEKS
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        generationConfig: {
          temperature: 0.5, // Diturunkan agar AI lebih logis dan tidak terlalu berkhayal (menulis esai)
          maxOutputTokens: 8192,
          responseMimeType: "application/json", 
          responseSchema: {
            type: SchemaType.OBJECT,
            description: "PENTING: TULIS DENGAN PADAT DAN RINGKAS. DILARANG KERAS menulis esai atau paragraf panjang pada field string.",
            // REQUIRED memastikan AI tidak boleh berhenti sebelum kolom ini terisi semua
            required: [
              "aiPersona", "assessmentGoal", "gradingStrictness", "reportTone",
              "expectedMetrics", "expectedAnalysisBlocks", "expectedRecommendations",
              "riskFramework", "customReadinessTiers"
            ],
            properties: {
              aiPersona: { type: SchemaType.STRING, description: "Maksimal 1 kalimat." },
              assessmentGoal: { type: SchemaType.STRING, description: "Maksimal 2 kalimat." },
              gradingStrictness: { type: SchemaType.STRING },
              reportTone: { type: SchemaType.STRING },
              mediaAnalysisFocus: { type: SchemaType.STRING },
              expectedMetrics: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "WAJIB BUAT 5 HINGGA 8 METRIK. Tulis padat maksimal 1 kalimat per metrik." 
              },
              expectedAnalysisBlocks: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "WAJIB BUAT 3 HINGGA 5 BLOK. Tulis padat maksimal 1 kalimat per blok." 
              },
              expectedRecommendations: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "WAJIB BUAT 3 HINGGA 4 REKOMENDASI. Tulis padat dan dapat dieksekusi." 
              },
              riskFramework: { 
                type: SchemaType.STRING, 
                description: "MUTLAK: MAKSIMAL 3 KALIMAT SAJA. Sebutkan poin red flags utama. DILARANG menulis panjang lebar." 
              },
              customReadinessTiers: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Wajib buat 3 tier (Fase Awal, Menengah, Matang)." 
              },
              customSystemPrompt: { type: SchemaType.STRING, description: "Maksimal 2 kalimat." },
              negativePrompts: { type: SchemaType.STRING, description: "Maksimal 2 kalimat." },
              formatInstructions: { type: SchemaType.STRING, description: "Maksimal 2 kalimat." },
              customScoringRubric: { type: SchemaType.STRING, description: "Maksimal 3 kalimat." }
            }
          }
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
      
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      const parsedConfig = JSON.parse(rawText);

      await storeTemplateResearchVector(safeTemplateId, `Config Research: ${topicToResearch}`, rawText, API_KEY)
         .catch(e => console.error(`Gagal merekam Vector Config Research untuk Template [${safeTemplateId}]:`, e));

      return { success: true, aiPromptConfig: parsedConfig };

    } catch (error: any) {
      console.error("Gagal melakukan Auto-Research AI Config:", error);
      throw new HttpsError("internal", error.message || "Gagal melakukan auto-research.");
    }
  }
);