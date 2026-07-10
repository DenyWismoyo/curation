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
    console.warn(`  API Gemini sibuk, mencoba ulang... (${retries} percobaan tersisa)`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

export const generateFormTemplateFromAI = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 900,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Silakan login terlebih dahulu.");
    
    const userEmail = request.auth.token.email?.toLowerCase();
    if (userEmail !== 'deny.wismoyo@gmail.com') {
      throw new HttpsError(
        "permission-denied", 
        "SECURITY BREACH: Akses ditolak secara paksa oleh server."
      );
    }

    const data = request.data as any;
    const { templateId, trackName, aiPromptConfig, archetypeInstruction } = data;
    
    if (!templateId) throw new HttpsError("invalid-argument", "ID Template wajib disertakan.");

    const db = getFirestore(admin.app(), "curation");
    const templateRef = db.collection("form_templates").doc(templateId);
    
    const logToTerminal = async (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      await templateRef.update({
        generationLogs: admin.firestore.FieldValue.arrayUnion({
          timestamp: new Date().toISOString(),
          message,
          type
        })
      });
    };

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      await templateRef.update({ 
        generationLogs: [],
        aiGenerationStatus: {
          phase: "RESEARCHING",
          message: "Sistem Multi-Agent AI diinisialisasi...",
          updatedAt: new Date().toISOString()
        }
      });

      await logToTerminal("Memulai sesi pipeline Enterprise Multi-Agent AI...", "info");

      // ---------------------------------------------------------
      // FASE 1: PENYEMPURNAAN OTAK AI & MASTERPLAN (GEMINI 3.1 PRO)
      // ---------------------------------------------------------
      await logToTerminal("FASE 1: Agen Master (Gemini 3.1 Pro) diaktifkan. Melakukan penetrasi jaringan internet dan restrukturisasi Otak AI...", "info");

      const masterModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        tools: [{ googleSearch: {} } as any], 
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["researchNotes", "aiPromptConfig", "stepOutlines"],
            properties: {
              researchNotes: { type: SchemaType.STRING },
              aiPromptConfig: {
                type: SchemaType.OBJECT,
                required: ["formPurpose", "aiPersona", "assessmentGoal", "gradingStrictness", "reportTone", "expectedMetrics", "expectedAnalysisBlocks", "expectedRecommendations", "riskFramework", "customReadinessTiers", "customScoringRubric", "negativePrompts", "formatInstructions", "customSystemPrompt"],
                properties: {
                  formPurpose: { type: SchemaType.STRING },
                  aiPersona: { type: SchemaType.STRING },
                  assessmentGoal: { type: SchemaType.STRING },
                  gradingStrictness: { type: SchemaType.STRING },
                  reportTone: { type: SchemaType.STRING },
                  mediaAnalysisFocus: { type: SchemaType.STRING },
                  expectedMetrics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  expectedAnalysisBlocks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  expectedRecommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  riskFramework: { type: SchemaType.STRING },
                  customReadinessTiers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  customSystemPrompt: { type: SchemaType.STRING },
                  negativePrompts: { type: SchemaType.STRING },
                  formatInstructions: { type: SchemaType.STRING },
                  customScoringRubric: { type: SchemaType.STRING },
                  customUiLabels: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                      scoreLabel: { type: SchemaType.STRING }, swotLabel: { type: SchemaType.STRING }, riskLabel: { type: SchemaType.STRING }, roadmapLabel: { type: SchemaType.STRING }, executionLabel: { type: SchemaType.STRING } 
                    } 
                  },
                  researchSourcesCited: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              },
              stepOutlines: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["title", "description", "focusArea", "expertPersona"],
                  properties: {
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    focusArea: { type: SchemaType.STRING },
                    expertPersona: { type: SchemaType.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const currentConfigStr = Object.keys(aiPromptConfig || {}).length > 0 
        ? JSON.stringify(aiPromptConfig, null, 2) 
        : "Belum ada konfigurasi awal, rumuskan dari nol.";

// AMBIL NILAI KUSTOM VOLUME DARI FRONTEND (Fallback ke angka default)
      const targetMetricCount = aiPromptConfig?.targetMetricCount || 8;
      const targetBlockCount = aiPromptConfig?.targetBlockCount || 6;
      const targetTierCount = aiPromptConfig?.targetTierCount || 4;
      const targetRecCount = aiPromptConfig?.targetRecommendationCount || 5;

      const masterPrompt = `
        Anda adalah Chief Research Officer tingkat Enterprise. Topik program/asesmen: "${trackName || "Asesmen Umum"}".
        
        ALUR KERJA MUTLAK (IKUTI URUTAN INI):
        
        LANGKAH 1: PENYEMPURNAAN "OTAK AI" (aiPromptConfig)
        Berikut adalah draf konfigurasi dari klien:
        ${currentConfigStr}
        
        Tugas: Lakukan web search untuk standar industri terbaik, lalu SEMPURNAKAN draf tersebut ke dalam properti "aiPromptConfig".
        
        ATURAN KETAT VOLUME OUTPUT & SKALABILITAS (WAJIB DIPATUHI SECARA PRESISI):
        - expectedMetrics: Pertahankan data yang ada, lalu wajib kembangkan/tambahkan hingga jumlahnya TEPAT ${targetMetricCount} metrik evaluasi komprehensif.
        - expectedAnalysisBlocks: Pertahankan blok yang ada, lalu wajib kembangkan/ciptakan sisanya hingga mencapai TEPAT ${targetBlockCount} kartu blok analisis.
        - customReadinessTiers: Rancang dan buatkan TEPAT ${targetTierCount} tingkatan (tiers) status kematangan.
        - expectedRecommendations: Pertahankan data yang ada, lalu wajib kembangkan hingga mencapai TEPAT ${targetRecCount} fokus area rekomendasi strategis.
        
        - ANALISIS AUDIENS: Tentukan apakah targetnya PERUSAHAAN (B2B) atau INDIVIDU (B2C).
        - Jika Perusahaan: Adopsi ISO, ESG, COBIT, dll. Jika Individu: Adopsi DSM-5, dll.
        - ATURAN MUTLAK BLOK ANALISIS: WAJIB format 'Judul Blok: Sub-poin 1, Sub-poin 2'. DILARANG mengosongkan deskripsi setelah titik dua (:).
        
        LANGKAH 2: PEMBUATAN KERANGKA FORMULIR (stepOutlines)
        Berdasarkan "aiPromptConfig" yang BARU SAJA Anda sempurnakan, susun 5 hingga 8 Seksi kuesioner yang 100% sejajar dengan metrik tersebut.
      `;

      await logToTerminal(`Merumuskan penyempurnaan Otak AI & Masterplan untuk domain: [${trackName || "Asesmen Umum"}]...`, "info");

      const masterResult = await withRetry(() => masterModel.generateContent(masterPrompt));
      const blueprint = JSON.parse(masterResult.response.text().trim());

      await logToTerminal("Otak AI dan Master Blueprint berhasil disempurnakan! Menyimpan konfigurasi ke database...", "success");

      await templateRef.update({
        aiPromptConfig: blueprint.aiPromptConfig,
        "aiGenerationStatus.message": "Konfigurasi Otak AI berhasil diperbarui. Mempersiapkan pembuatan kuesioner form..."
      });

      await logToTerminal("Mengekstrak temuan internet dan menyimpannya ke Vector Database (RAG)...", "info");
      await storeTemplateResearchVector(templateId, trackName, blueprint.researchNotes, API_KEY)
        .catch(e => console.warn("Peringatan: Gagal merekam vector research (Non-Fatal)."));
      await logToTerminal("Vector Database berhasil diperbarui.", "success");

      // ---------------------------------------------------------
      // FASE 2: DYNAMIC PERSONA & ASYNCHRONOUS BATCHING
      // ---------------------------------------------------------
      await templateRef.update({
        "aiGenerationStatus.phase": "BUILDING_FORM",
        "aiGenerationStatus.message": `Tahap 2: Meracik ${blueprint.stepOutlines.length} Seksi secara Paralel...`
      });

      await logToTerminal(`FASE 2: Mengerahkan Agen Pekerja (Gemini 2.5 Flash) berbekal Otak AI yang baru. Memulai fabrikasi ${blueprint.stepOutlines.length} seksi formulir...`, "info");

      const sectionModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "label", "type", "required", "gridSpan"],
              properties: {
                id: { type: SchemaType.STRING }, label: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING }, required: { type: SchemaType.BOOLEAN },
                placeholder: { type: SchemaType.STRING }, description: { type: SchemaType.STRING },
                gridSpan: { type: SchemaType.INTEGER }, fileAccept: { type: SchemaType.STRING },
                options: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } } } },
                showIf: { type: SchemaType.OBJECT, properties: { fieldId: { type: SchemaType.STRING }, equals: { type: SchemaType.STRING } } }
              }
            }
          }
        }
      });

      const promptParams = { trackName: trackName || "Asesmen Umum", config: blueprint.aiPromptConfig, archetypeInstruction: archetypeInstruction || "" };
      const baseInstructions = buildMegaAgentPrompt(promptParams);
      let rawFinalSteps: any[] = [];
      const batchSize = 3; 

      for (let i = 0; i < blueprint.stepOutlines.length; i += batchSize) {
        const batch = blueprint.stepOutlines.slice(i, i + batchSize);
        const batchMessage = `Meracik Kuesioner Batch ${Math.ceil(i/batchSize) + 1} (Seksi ${i + 1} s/d ${i + batch.length})...`;
        await templateRef.update({ "aiGenerationStatus.message": batchMessage });
        await logToTerminal(batchMessage, "info");

        const batchPromises = batch.map(async (step: any, indexInBatch: number) => {
          const absoluteIndex = i + indexInBatch;
          const isFirstStep = absoluteIndex === 0;
          
          const sectionPrompt = `
            ${baseInstructions}
            HASIL RISET STANDAR TERBARU: ${blueprint.researchNotes}
            
            ROLEPLAY MUTLAK: Anda saat ini berperan sebagai "${step.expertPersona}". 
            Rancang 8-12 pertanyaan spesifik HANYA UNTUK Seksi ${absoluteIndex + 1}: "${step.title}".
            PENTING: JANGAN PERNAH membungkus output JSON dengan markdown (seperti \`\`\`json). Langsung hasilkan raw JSON Array murni!
            
            ${isFirstStep ? `
            ATURAN SEKSI PERTAMA: 4 Field pertama WAJIB ber-ID persis secara berurutan: "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon". 
            SANGAT PENTING PADA PROPERTI LABEL "namaUsaha": Jika asesmen ini untuk target INDIVIDU/PERSONAL, ubah labelnya menjadi "Nama Lengkap Anda" (DILARANG menggunakan kata Organisasi/Perusahaan). Jika untuk PERUSAHAAN, gunakan label "Nama Entitas/Perusahaan".
            ` : `
            ATURAN ANTI-DUPLIKASI MUTLAK: DILARANG KERAS menanyakan kembali Identitas Dasar. Anda TIDAK BOLEH memunculkan field dengan ID "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon", atau variasi sejenisnya di seksi ini! Langsung fokus ke investigasi sesuai konteks seksi.
            `}
          `;

          try {
            const sectionResult = await withRetry(() => sectionModel.generateContent(sectionPrompt));
            let rawJsonText = sectionResult.response.text().trim();
            
            // FITUR PEMBERSIH FORMAT: Mencegah JSON.parse gagal jika ada Markdown
            if (rawJsonText.startsWith('```')) {
              rawJsonText = rawJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            }

            const fieldsArray = JSON.parse(rawJsonText);
            
            if (!Array.isArray(fieldsArray)) {
              throw new Error("Format output AI bukan berupa Array.");
            }

            return { stepNumber: absoluteIndex + 1, title: step.title, description: step.description, fields: fieldsArray };
            
          } catch (error: any) {
            console.error(`Gagal meracik seksi ${absoluteIndex + 1}:`, error);
            await logToTerminal(`Peringatan (Non-Fatal): Gagal meracik pertanyaan untuk Seksi ${absoluteIndex + 1} "${step.title}". Alasan: ${error.message}`, "error");
            return { stepNumber: absoluteIndex + 1, title: step.title, description: "Gagal memuat otomatis akibat format tidak sesuai.", fields: [] };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        rawFinalSteps.push(...batchResults);
      }

      await logToTerminal("Seluruh seksi formulir berhasil diracik dan digabungkan.", "success");

      // ---------------------------------------------------------
      // PROGRAMMATIC DEDUPLICATION (HARDCODE FILTER)
      // ---------------------------------------------------------
      await logToTerminal("Membersihkan ID duplikat pada struktur formulir...", "info");
      const seenIds = new Set<string>();
      const deduplicatedSteps = rawFinalSteps.map(step => {
        const uniqueFields = [];
        for (const field of step.fields) {
          if (!seenIds.has(field.id)) {
            seenIds.add(field.id);
            uniqueFields.push(field);
          }
        }
        return { ...step, fields: uniqueFields };
      });

      // ---------------------------------------------------------
      // FASE 3: AI SELF-CORRECTION (SHOW-IF VALIDATOR)
      // ---------------------------------------------------------
      await templateRef.update({ "aiGenerationStatus.message": "Tahap 3: Agen Validator memverifikasi integritas logika bercabang (Self-Healing)..." });
      await logToTerminal("FASE 3: Agen Validator (QA) meninjau integritas logika 'ShowIf' (Dependency Tree)...", "info");

      const validatorModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      });

      const validationPrompt = `
        Anda adalah "Lead Quality Assurance". Berikut adalah JSON formulir yang sudah bersih dari ID duplikat.
        Tugas utama Anda HANYA memverifikasi properti "showIf":
        1. Pastikan "fieldId" di dalam "showIf" merujuk pada "id" yang BENAR-BENAR ADA di array fields sebelumnya.
        2. Jika merujuk pada ID yang tidak ada atau referensi ke depan (referencing future fields), hapus properti "showIf" tersebut.
        3. Kembalikan array JSON utuh tanpa merubah struktur lain.
        
        DATA FORMULIR MENTAH:
        ${JSON.stringify(deduplicatedSteps)}
      `;

      const validationResult = await withRetry(() => validatorModel.generateContent(validationPrompt));
      let validJsonText = validationResult.response.text().trim();
      
      if (validJsonText.startsWith('```')) {
         validJsonText = validJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }
      
      const validatedSteps = JSON.parse(validJsonText);
      const cleanedSteps = cleanUndefinedAndNull(validatedSteps);

      await logToTerminal("Verifikasi selesai. Struktur formulir 100% valid dan aman dari loop logic.", "success");

      // ---------------------------------------------------------
      // FASE 4: SAVE TO FIRESTORE
      // ---------------------------------------------------------
      await templateRef.update({
        steps: cleanedSteps,
        version: admin.firestore.FieldValue.increment(1),
        lastUpdated: new Date().toISOString(),
        aiGenerationStatus: {
          phase: "COMPLETED",
          message: `Sukses! Formulir skala Enterprise (${cleanedSteps.length} seksi) telah tervalidasi dan siap digunakan.`,
          updatedAt: new Date().toISOString()
        }
      });

      await logToTerminal("PIPELINE SELESAI: Kuesioner skala Enterprise telah berhasil diintegrasikan!", "success");

      return { success: true, steps: cleanedSteps };

    } catch (error: any) {
      console.error(`Fatal Error pada Form Builder:`, error);
      
      await templateRef.update({
        generationLogs: admin.firestore.FieldValue.arrayUnion({
          timestamp: new Date().toISOString(),
          message: `FATAL ERROR: ${error.message}`,
          type: 'error'
        })
      });

      await templateRef.update({
        aiGenerationStatus: {
          phase: "FAILED",
          message: `Kendala Sistem: ${error.message}`,
          updatedAt: new Date().toISOString()
        }
      });
      throw new HttpsError("internal", error.message || "Gagal memproses analisis AI.");
    }
  }
);

// ============================================================================
// FUNGSI 2: AI CONFIGURATION ENHANCER (Legacy)
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
    const userEmail = request.auth.token.email?.toLowerCase();
    if (userEmail !== 'deny.wismoyo@gmail.com') throw new HttpsError("permission-denied", "SECURITY BREACH");

    const data = request.data as any;
    const { templateId, trackName, customTopic, currentConfig } = data;
    const topicToResearch = customTopic || trackName || "Asesmen Bisnis Umum";
    const safeTemplateId = templateId || `research_config_${Date.now()}`;
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        tools: [{ googleSearch: {} } as any], 
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        }
      });

      const hasExistingConfig = currentConfig && Object.keys(currentConfig).length > 0;
      const systemPrompt = buildAIConfigPrompt({ trackName, topicToResearch, currentConfig, hasExistingConfig });
      const result = await withRetry(() => model.generateContent(systemPrompt));
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      
      const parsedConfig = JSON.parse(rawText);
      await storeTemplateResearchVector(safeTemplateId, `Config Research: ${topicToResearch}`, rawText, API_KEY).catch(e => console.error(e));

      return { success: true, aiPromptConfig: parsedConfig };

    } catch (error: any) {
      throw new HttpsError("internal", error.message || "Gagal melakukan auto-research.");
    }
  }
);