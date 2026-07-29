// functions/src/agents/formBuilder/validatorAgent.ts

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const logToTerminal = async (docRef: admin.firestore.DocumentReference, message: string, type: 'info' | 'success' | 'error' = 'info') => {
  await docRef.update({
    generationLogs: admin.firestore.FieldValue.arrayUnion({
      timestamp: new Date().toISOString(),
      message,
      type
    })
  });
};

const cleanUndefinedAndNull = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(cleanUndefinedAndNull).filter(v => v != null);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null && v !== "").map(([k, v]) => [k, cleanUndefinedAndNull(v)])
    );
  }
  return obj;
};

import { withRetry } from "../../utils/retry";

export const executeValidator = async (
  templateId: string,
  afterData: any,
  templateRef: admin.firestore.DocumentReference
): Promise<any> => {
  try {
    await logToTerminal(templateRef, "FASE 3: Polisher Agent (Gemini 3.1 Flash-Lite) diaktifkan. Melakukan QA Logika sekaligus memoles UI/UX form...", "info");
    
    const rawSteps = afterData.rawStepsCache || [];
    const targetAudience = afterData.aiPromptConfig?.targetAudience === 'individual' ? 'Personal/Individu' : 'Perusahaan/B2B';
    const preferredTypes = afterData.preferredQuestionTypes || [];

    // 1. HARDCODE DEDUPLICATION (Mencegah ID ganda)
    const seenIds = new Set<string>();
    const deduplicatedSteps = rawSteps.map((step: any) => {
      const uniqueFields = [];
      for (const field of step.fields) {
        if (!seenIds.has(field.id)) {
          seenIds.add(field.id);
          uniqueFields.push(field);
        }
      }
      return { ...step, fields: uniqueFields };
    });

    // 2. MEMBUAT KAMUS REFERENSI (Mengatasi AI Blindness)
    // AI butuh contekan seluruh form agar tahu opsi pemicu mana yang valid untuk showIf
    const allAvailableFieldsDictionary = deduplicatedSteps.flatMap((s: any) => 
      s.fields.map((f: any) => ({
        id: f.id,
        type: f.type,
        options: f.options?.map((o: any) => typeof o === 'object' ? o.label : o) || []
      }))
    );

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    // 3. MENGGUNAKAN GEMINI 3.1 FLASH-LITE DENGAN SKEMA ABSOLUT
    const validatorModel = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { 
        temperature: 0.15, // Diturunkan sedikit agar lebih presisi dalam copy-paste logika
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            required: ["id", "label", "type", "required", "gridSpan"],
            properties: {
              id: { type: SchemaType.STRING },
              label: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              aiReasoning: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING },
              required: { type: SchemaType.BOOLEAN },
              gridSpan: { type: SchemaType.INTEGER },
              fileAccept: { type: SchemaType.STRING },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } } } },
              showIf: { 
                 type: SchemaType.OBJECT, 
                 required: ["fieldId", "equals"], // PERBAIKAN FATAL: Memaksa AI mengisi 'equals'
                 properties: { 
                   fieldId: { type: SchemaType.STRING }, 
                   equals: { type: SchemaType.STRING } 
                 } 
               }
            }
          }
        }
      }
    });

    // 4. PROSES VALIDASI & ENHANCEMENT
    const enhancedStepsPromises = deduplicatedSteps.map(async (step: any, index: number) => {
      await logToTerminal(templateRef, `Memoles UI dan menyembuhkan logika pada Seksi ${index + 1}: ${step.title}...`, "info");
      
      const enhancementPrompt = `
        Anda adalah "Lead Quality Assurance & Eksekutif UI/UX Copywriter".
        Tugas Anda adalah meninjau, menyembuhkan (healing), dan mempercantik JSON array pertanyaan untuk Seksi: "${step.title}".
        Target Audiens Asesmen: ${targetAudience}.

        REFERENSI SELURUH PERTANYAAN (KAMUS LOGIKA):
        Gunakan data di bawah ini HANYA sebagai contekan untuk memastikan properti "showIf.fieldId" dan "showIf.equals" valid!
        ${JSON.stringify(allAvailableFieldsDictionary)}

        DATA KUESIONER MENTAH (Seksi yang harus Anda poles & koreksi):
        ${JSON.stringify(step.fields)}

        ATURAN 1: PENYEMPURNAAN KOSMETIK (ENHANCEMENT MUTLAK)
        - PERTAJAM LABEL: Wajib sematkan Markdown (**teks tebal**) pada istilah kunci di dalam "label" atau "description". Wajib gunakan tata bahasa yang profesional.
        - AI REASONING: Berikan 1 kalimat tajam analitis di properti "aiReasoning" yang menjelaskan mengapa pertanyaan ini ditanyakan. (Abaikan aiReasoning untuk data dasar identitas).
        - CERDASKAN INPUT: Jika ada input mentah tipe "text" yang lebih cocok diubah menjadi "select" atau "radio" berbobot (weight 0-100), silakan ubah. 

        ATURAN 2: PENYELAMATAN LOGIKA BERCABANG (HEALING SHOW-IF MUTLAK)
        Tinjau ketat properti "showIf" pada data mentah.
        1. Properti "equals" WAJIB DIISI! Tidak boleh berupa string kosong ("").
        2. Cocokkan "showIf.fieldId" dengan Kamus Logika di atas. Temukan field pemicunya dan lihat array "options"-nya.
        3. Properti "equals" WAJIB berisi SAMA PERSIS (Copy-Paste case-sensitive) dari salah satu teks yang ada di array "options" field pemicu tersebut! Jika ada typo, PERBAIKI!
        4. Jika "fieldId" tidak ditemukan di Kamus Logika, ATAU field pemicunya tidak memiliki "options", Anda WAJIB MENGHAPUS properti "showIf" sepenuhnya dari output.

        ATURAN 3: VALIDASI KONTEN METRIK (SUBSTANSIAL)
        Metrik yang WAJIB dievaluasi di seksi ini: ${JSON.stringify(step.targetMetrics || [])}
        Pastikan daftar pertanyaan ini sudah cukup untuk mengumpulkan data guna mengukur metrik di atas secara akurat.
        Jika ada metrik yang sama sekali belum terwakili oleh pertanyaan yang ada, TAMBAHKAN pertanyaan baru yang spesifik mengukur metrik tersebut.

        ATURAN 4: KEKETATAN (GRADING STRICTNESS)
        Tingkat keketatan: ${afterData.aiPromptConfig?.gradingStrictness || 'standard'}
        Jika 'strict', pastikan ada minimal 1 pertanyaan bertipe 'file' atau 'textarea' untuk meminta BUKTI/JUSTIFIKASI atas klaim besar (gunakan showIf).

        ATURAN 5: PREFERENSI INPUT (PREFERRED TYPES)
        Preferensi tipe input yang diinginkan: ${JSON.stringify(preferredTypes)}
        Sesuaikan perubahan tipe input mentah dengan preferensi di atas (misalnya ubah text ke radio jika preferredTypes berisi 'radio_weight').

        OUTPUT HANYA ARRAY JSON YANG TELAH DISEMPURNAKAN DAN DISEMBUHKAN. JANGAN PERNAH MERUBAH PROPERTI "id" PADA PERTANYAAN.
      `;

      try {
        const result = await withRetry(() => validatorModel.generateContent(enhancementPrompt));
        let validJsonText = result.response.text().trim();
        if (validJsonText.startsWith('```')) validJsonText = validJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
        
        const enhancedFields = JSON.parse(validJsonText);
        return { ...step, fields: enhancedFields };
      } catch (err: any) {
        await logToTerminal(templateRef, `Peringatan: Gagal memoles Seksi ${index + 1}, menggunakan data raw. Error: ${err.message}`, "error");
        return step; // Fallback ke data mentah jika AI timeout
      }
    });

    const validatedStepsRaw = await Promise.all(enhancedStepsPromises);
    const cleanedSteps = cleanUndefinedAndNull(validatedStepsRaw);

    await logToTerminal(templateRef, "Proses Polishing & QA Logika selesai. Kuesioner kini tervalidasi dan estetik 100%.", "success");

    const formMode = afterData.formMode || "standard";
    const isAdaptive = afterData.aiPromptConfig?.isAdaptive || formMode === 'adaptive' || formMode === 'hybrid';

    if (isAdaptive) {
      const updateData = {
        steps: cleanedSteps,
        aiGenerationStatus: {
          phase: "PRE_WARMING", 
          message: "Validasi selesai. Mengalihkan ke RAG Seeder Agent untuk injeksi pengetahuan...",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };
      await templateRef.update(updateData);
      return { success: true, nextPhase: "PRE_WARMING" };
    } else {
      const updateData = {
        steps: cleanedSteps,
        stepOutlinesCache: admin.firestore.FieldValue.delete(),
        researchNotesCache: admin.firestore.FieldValue.delete(),
        rawStepsCache: admin.firestore.FieldValue.delete(),
        version: admin.firestore.FieldValue.increment(1),
        lastUpdated: new Date().toISOString(),
        aiGenerationStatus: {
          phase: "COMPLETED", 
          message: `Sukses! Formulir skala Enterprise (${cleanedSteps.length} seksi) telah dipercantik dan siap digunakan.`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };
      await templateRef.update(updateData);
      await logToTerminal(templateRef, "PIPELINE SELESAI: Kuesioner skala Enterprise telah berhasil diintegrasikan!", "success");
      return { success: true, nextPhase: "COMPLETED" };
    }

  } catch (error: any) {
    console.error("Validator Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Validator (Polisher) Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    throw error;
  }
};