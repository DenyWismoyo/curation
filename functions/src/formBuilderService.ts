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

// PERBAIKAN: withRetry diperkuat agar tidak mengulang (retry) jika error mutlak (seperti Safety Block / 400)
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
// FUNGSI 1: MEMBANGUN FORMULIR BERDASARKAN CONFIG
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
          phase: "RESEARCHING",
          message: "AI sedang melakukan Deep Research mengenai kerangka kerja industri global...",
          updatedAt: new Date().toISOString()
        }
      });

      const researchModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview", 
        generationConfig: { temperature: 0.7 }
      });

      const goal = aiPromptConfig?.assessmentGoal || "Evaluasi mendalam pemetaan kualitas.";
      const researchPrompt = `
        Anda adalah Chief Research Officer tingkat Enterprise. Tugas Anda adalah menyusun referensi kerangka kerja (framework) dan daftar variabel metrik terbaik di dunia untuk mengukur program: "${trackName || "Asesmen Umum"}".
        Tujuan asesmen ini adalah: "${goal}".
        Tuliskan 3 kerangka teori/framework standar global yang paling relevan (misal: ISO, COBIT, ESG, TRL, SNI, Y-Combinator Metrics), dan jabarkan indikator spesifik yang harus ditanyakan dalam formulir.
      `;

      console.log(`🔍 [${templateId}] Menjalankan Deep Research Latar Belakang menggunakan 3.1 Pro Preview...`);
      const researchResult = await withRetry(() => researchModel.generateContent(researchPrompt));
      const deepResearchContext = researchResult.response.text();

      await storeTemplateResearchVector(templateId, trackName, deepResearchContext, API_KEY)
         .catch(e => console.error("Gagal merekam vector research formulir:", e));

      await templateRef.update({
        aiGenerationStatus: {
          phase: "BUILDING_FORM",
          message: "Riset selesai. AI sedang merancang skema pertanyaan bercabang & scoring matrix...",
          updatedAt: new Date().toISOString()
        }
      });

      // PERBAIKAN: Mengganti model yang salah (gemini-3.5-flash) menjadi gemini-3.1-pro-preview
      const architectModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview", 
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      });

      const promptParams = {
        trackName: trackName || "Asesmen Umum",
        config: aiPromptConfig || {},
        archetypeInstruction: archetypeInstruction || ""
      };

      const finalPrompt = `
        ${buildMegaAgentPrompt(promptParams)}
        
        BERIKUT ADALAH HASIL DEEP RESEARCH YANG WAJIB ANDA JADIKAN ACUAN PERTANYAAN:
        ${deepResearchContext}
      `;

      let attempt = 0;
      const MAX_ATTEMPTS = 3;

      while (attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
          console.log(`🏗️ [${templateId}] Merakit struktur form JSON - Percobaan ${attempt}`);
          const result = await withRetry(() => architectModel.generateContent(finalPrompt));
          
          // PERBAIKAN: Optimasi parsing, memanfaatkan native JSON response
          let rawText = result.response.text().trim();
          // Fallback pembersihan ringan jika API sesekali masih membungkus tag markdown
          if (rawText.startsWith('```json')) {
            rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          }

          const parsedObject = JSON.parse(rawText);
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

        } catch (parseError: any) {
          console.error(`❌ Gagal merangkai JSON pada percobaan ${attempt}:`, parseError.message);
          if (attempt >= MAX_ATTEMPTS) throw parseError;
        }
      }
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
    timeoutSeconds: 300, // PERBAIKAN: Diperpanjang menjadi 300 detik (5 menit) untuk reasoning
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
        model: "gemini-3.1-pro-preview", 
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json", 
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
      
      // PERBAIKAN: Optimasi parsing, memanfaatkan native JSON response
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