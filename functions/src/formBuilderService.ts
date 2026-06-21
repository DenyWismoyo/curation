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
        model: "gemini-3.5-flash", // Atau gemini-1.5-pro
        generationConfig: {
          temperature: 0.6, 
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            description: "PENTING: JAGA TOTAL OUTPUT AGAR TIDAK MELEBIHI 35 FIELDS KESELURUHAN UNTUK MENCEGAH TERPOTONG.",
            required: ["researchNotes", "steps"],
            properties: {
              researchNotes: { 
                type: SchemaType.STRING, 
                description: "Tulis ringkasan taktis maksimal 2 kalimat." 
              },
              steps: {
                type: SchemaType.ARRAY,
                description: "Hasilkan 3 hingga 5 Langkah (Steps) yang menyeluruh dan mendalam.",
                items: {
                  type: SchemaType.OBJECT,
                  required: ["stepNumber", "title", "fields"],
                  properties: {
                    stepNumber: { type: SchemaType.INTEGER },
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING, description: "Berikan pengantar naratif atau konteks untuk langkah ini." },
                    fields: {
                      type: SchemaType.ARRAY,
                      description: "Hasilkan 5 hingga 8 pertanyaan per langkah secara efektif.",
                      items: {
                        type: SchemaType.OBJECT,
                        required: ["id", "label", "type", "required", "gridSpan"],
                        properties: {
                          id: { type: SchemaType.STRING, description: "ID Unik camelCase." },
                          label: { type: SchemaType.STRING, description: "Gunakan bahasa profesional atau tuliskan skenario studi kasus (maksimal 2 kalimat)." },
                          type: { type: SchemaType.STRING, description: "HANYA: text, textarea, number, select, radio, checkbox, file, date" },
                          required: { type: SchemaType.BOOLEAN },
                          description: { type: SchemaType.STRING, description: "Tuliskan panduan cara menjawab atau konteks risiko." },
                          placeholder: { type: SchemaType.STRING, description: "WAJIB ADA untuk tipe text/textarea/number. Berikan contoh jawaban." },
                          validationRegex: { type: SchemaType.STRING, description: "Opsional. Pola Regex untuk memvalidasi input jika diperlukan." },
                          gridSpan: { type: SchemaType.INTEGER, description: "Gunakan 1 atau 2." },
                          fileAccept: { type: SchemaType.STRING, description: "Isi '.pdf' jika type adalah file." },
                          options: {
                            type: SchemaType.ARRAY,
                            description: "MUTLAK WAJIB DIISI JIKA TYPE 'radio', 'select', atau 'checkbox'. Maksimal 4 opsi.",
                            items: {
                              type: SchemaType.OBJECT,
                              required: ["label", "weight"],
                              properties: {
                                label: { type: SchemaType.STRING },
                                weight: { type: SchemaType.INTEGER, description: "Angka 0 - 100" }
                              }
                            }
                          },
                          showIf: {
                            type: SchemaType.OBJECT,
                            description: "Opsional. JANGAN PERNAH merujuk ke ID field ini sendiri.",
                            required: ["fieldId", "equals"],
                            properties: {
                              fieldId: { type: SchemaType.STRING, description: "ID dari pertanyaan SEBELUMNYA." },
                              equals: { type: SchemaType.STRING, description: "Jawaban pemicu munculnya field ini." }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
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
      `;

      console.log(`🏗️ [${templateId}] Merakit struktur form JSON berskala masif...`);
      const result = await withRetry(() => architectModel.generateContent(finalPrompt));
      
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      
      const parsedObject = JSON.parse(rawText);

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
        model: "gemini-2.5-flash", 
        generationConfig: {
          temperature: 0.5, 
          maxOutputTokens: 8192,
          responseMimeType: "application/json", 
          responseSchema: {
            type: SchemaType.OBJECT,
            description: "PENTING: TULIS DENGAN PADAT DAN RINGKAS. DILARANG KERAS menulis esai atau paragraf panjang pada field string.",
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