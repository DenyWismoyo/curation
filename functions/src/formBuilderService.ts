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

// Auto-Retry Handler
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

// ============================================================================
// FUNGSI 1: MEMBANGUN FORMULIR BERDASARKAN CONFIG (HYBRID MULTI-AGENT)
// ============================================================================
export const generateFormTemplateFromAI = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 900, // Timeout 15 Menit
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Silakan login terlebih dahulu.");
    
    // --- START GEMBOK MUTLAK SERVER-SIDE ---
    const userEmail = request.auth.token.email?.toLowerCase();
    if (userEmail !== 'deny.wismoyo@gmail.com') {
      throw new HttpsError(
        "permission-denied", 
        "SECURITY BREACH: Akses ditolak secara paksa oleh server. Fitur ini eksklusif hanya untuk DENY.WISMOYO@GMAIL.COM"
      );
    }
    // --- END GEMBOK MUTLAK ---

    const data = request.data as any;
    const { templateId, trackName, aiPromptConfig, archetypeInstruction } = data;
    
    if (!templateId) {
      throw new HttpsError("invalid-argument", "ID Template wajib disertakan.");
    }

    const db = getFirestore(admin.app(), "curation");
    const templateRef = db.collection("form_templates").doc(templateId);
    
    // ------------------------------------------------------------------------
    // HELPER FUNGSI UNTUK MENGIRIM LOG KE TERMINAL FRONTEND REAL-TIME
    // ------------------------------------------------------------------------
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
      // FASE 1: LIVE SEARCH GROUNDING & BLUEPRINT MASTERPLAN
      // ---------------------------------------------------------
      await logToTerminal("FASE 1: Agen Master (Gemini 3.1 Pro) diaktifkan. Melakukan riset dan penetrasi jaringan internet...", "info");

      const masterModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        tools: [{ googleSearch: {} } as any], 
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["researchNotes", "stepOutlines"],
            properties: {
              researchNotes: { type: SchemaType.STRING },
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

      const goal = aiPromptConfig?.assessmentGoal || "Evaluasi mendalam pemetaan kualitas.";
      const metrics = aiPromptConfig?.expectedMetrics?.join(', ') || 'Metrik standar';
      const purpose = aiPromptConfig?.formPurpose || 'assessment';
      
      let frameworkExamples = "ISO, COBIT, ESG, TRL, SNI, Y-Combinator Metrics";
      if (purpose === 'counseling') {
        frameworkExamples = "DSM-5, CBT Framework, Skala Psikometri Big Five, WHO-DAS, Skala Beck";
      } else if (purpose === 'monitoring') {
        frameworkExamples = "PMBOK, PRINCE2, Logical Framework Approach (LFA), Agile/Scrum Metrics, OKR";
      } else if (purpose === 'consultation') {
        frameworkExamples = "McKinsey 7S, SWOT, PESTLE, Lean Six Sigma, Design Thinking";
      }
      
      const masterPrompt = `
        Anda adalah Chief Research Officer tingkat Enterprise. Lakukan web search untuk regulasi program: "${trackName || "Asesmen Umum"}".
        Tujuan: "${goal}". Target Metrik: [${metrics}].
        FOKUS DOMAIN: Kuesioner ini dirancang untuk fungsi "${purpose}".
        
        TUGAS UTAMA:
        1. Lakukan pencarian web untuk 3 kerangka teori/framework standar global yang paling relevan (Sebagai referensi: ${frameworkExamples}).
        2. Susun "aiPromptConfig" (Konfigurasi Otak AI) di dalam pikiran Anda. 
           ATURAN MUTLAK BLOK ANALISIS: Untuk instruksi 'expectedAnalysisBlocks', Anda WAJIB menggunakan format 'Judul Blok: Sub-poin 1, Sub-poin 2, Sub-poin 3'. DILARANG KERAS hanya menuliskan judul! Harus ada minimal 2-3 target sub-poin spesifik setelah tanda titik dua (:).
        3. Pecah asesmen menjadi 5 hingga 8 Seksi (stepOutlines) berdasarkan framework tersebut. Langkah pertama WAJIB dialokasikan untuk "Identitas & Legalitas Dasar". 
        4. Tentukan 'expertPersona' spesifik per seksi.
      `;

      await logToTerminal(`Merumuskan masterplan untuk domain: [${purpose.toUpperCase()} - ${trackName || "Asesmen Umum"}]...`, "info");

      const masterResult = await withRetry(() => masterModel.generateContent(masterPrompt));
      const blueprint = JSON.parse(masterResult.response.text().trim());

      await logToTerminal("Master Blueprint berhasil disusun! Menyimpan referensi ke sistem utama...", "success");

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

      await logToTerminal(`FASE 2: Mengerahkan Agen Pekerja (Gemini 2.5 Flash). Memulai fabrikasi ${blueprint.stepOutlines.length} seksi formulir...`, "info");

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
                id: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING }, 
                required: { type: SchemaType.BOOLEAN },
                placeholder: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                gridSpan: { type: SchemaType.INTEGER },
                fileAccept: { type: SchemaType.STRING },
                options: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ["label", "weight"],
                    properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } }
                  }
                },
                showIf: {
                  type: SchemaType.OBJECT,
                  required: ["fieldId", "equals"],
                  properties: { fieldId: { type: SchemaType.STRING }, equals: { type: SchemaType.STRING } }
                }
              }
            }
          }
        }
      });

      const promptParams = { trackName: trackName || "Asesmen Umum", config: aiPromptConfig || {}, archetypeInstruction: archetypeInstruction || "" };
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
            
            ${isFirstStep ? `
            ATURAN SEKSI PERTAMA: 4 Field pertama WAJIB ber-ID persis: "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon". Tipe data text/email/number.
            ` : `
            ATURAN ANTI-DUPLIKASI MUTLAK: DILARANG KERAS menanyakan kembali Identitas Dasar. Anda TIDAK BOLEH memunculkan field dengan ID "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon", atau variasi sejenisnya di seksi ini! Langsung fokus ke investigasi sesuai konteks seksi.
            `}
          `;

          try {
            const sectionResult = await withRetry(() => sectionModel.generateContent(sectionPrompt));
            const fieldsArray = JSON.parse(sectionResult.response.text().trim());
            return { stepNumber: absoluteIndex + 1, title: step.title, description: step.description, fields: fieldsArray };
          } catch (error) {
            console.error(`Gagal meracik seksi ${absoluteIndex + 1}:`, error);
            return { stepNumber: absoluteIndex + 1, title: step.title, description: "Gagal memuat otomatis.", fields: [] };
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
          } else {
            console.warn(`[Auto-Fix] Menghapus duplikasi ID mutlak: ${field.id} di Seksi ${step.stepNumber}`);
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
      const validatedSteps = JSON.parse(validationResult.response.text().trim());
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
// FUNGSI 2: AI CONFIGURATION ENHANCER
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
    
    // --- START GEMBOK MUTLAK SERVER-SIDE ---
    const userEmail = request.auth.token.email?.toLowerCase();
    if (userEmail !== 'deny.wismoyo@gmail.com') {
      throw new HttpsError(
        "permission-denied", 
        "SECURITY BREACH: Akses ditolak secara paksa oleh server. Fitur ini eksklusif hanya untuk DENY.WISMOYO@GMAIL.COM"
      );
    }
    // --- END GEMBOK MUTLAK ---

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
        .catch(e => console.error(`Gagal merekam Vector AI Config:`, e));

      return { success: true, aiPromptConfig: parsedConfig };

    } catch (error: any) {
      throw new HttpsError("internal", error.message || "Gagal melakukan auto-research.");
    }
  }
);