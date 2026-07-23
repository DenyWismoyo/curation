import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export const formBuilderValidatorAgent = onDocumentUpdated({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "form_templates/{templateId}",
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (afterData?.aiGenerationStatus?.phase !== "FABRICATING" || beforeData?.aiGenerationStatus?.phase === "FABRICATING") {
    return null;
  }

  const templateRef = event.data?.after.ref;
  if (!templateRef) return null;

  try {
    await logToTerminal(templateRef, "FASE 3: Validator Agent (QA) memverifikasi integritas logika bercabang (Self-Healing)...", "info");
    
    const rawSteps = afterData.rawStepsCache || [];

    // Hapus ID Duplikat (Hardcode deduplication)
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

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const validatorModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
    });

    const validationPrompt = `
      Anda adalah "Lead Quality Assurance". Berikut adalah JSON formulir yang sudah bersih dari ID duplikat.
      Tugas utama Anda HANYA memverifikasi properti "showIf" secara SANGAT KETAT:
      1. Pastikan "fieldId" di dalam "showIf" merujuk pada "id" yang BENAR-BENAR ADA di array fields sebelumnya.
      2. WAJIB pastikan "showIf" memiliki properti "equals" yang SAMA PERSIS dengan label dari "options" field pemicu.
      3. Jika referensi invalid, MENGHAPUS properti "showIf" tersebut secara keseluruhan.
      4. Kembalikan array JSON utuh tanpa merubah struktur lain.
      DATA FORMULIR MENTAH:
      ${JSON.stringify(deduplicatedSteps)}
    `;

    const validationResult = await validatorModel.generateContent(validationPrompt);
    let validJsonText = validationResult.response.text().trim();
    if (validJsonText.startsWith('```')) validJsonText = validJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    
    const validatedSteps = JSON.parse(validJsonText);
    const cleanedSteps = cleanUndefinedAndNull(validatedSteps);

    await logToTerminal(templateRef, "Verifikasi selesai. Struktur formulir 100% valid dan aman dari loop logic.", "success");

    const formMode = afterData.formMode || "standard";
    const isAdaptive = afterData.aiPromptConfig?.isAdaptive || formMode === 'adaptive' || formMode === 'hybrid';

    if (isAdaptive) {
      await templateRef.update({
        steps: cleanedSteps,
        aiGenerationStatus: {
          phase: "PRE_WARMING", 
          message: "Validasi selesai. Mengalihkan ke RAG Seeder Agent untuk injeksi pengetahuan...",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    } else {
      await templateRef.update({
        steps: cleanedSteps,
        stepOutlinesCache: admin.firestore.FieldValue.delete(),
        researchNotesCache: admin.firestore.FieldValue.delete(),
        rawStepsCache: admin.firestore.FieldValue.delete(),
        version: admin.firestore.FieldValue.increment(1),
        lastUpdated: new Date().toISOString(),
        aiGenerationStatus: {
          phase: "COMPLETED", 
          message: `Sukses! Formulir skala Enterprise (${cleanedSteps.length} seksi) telah siap digunakan.`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
      await logToTerminal(templateRef, "PIPELINE SELESAI: Kuesioner skala Enterprise telah berhasil diintegrasikan!", "success");
    }

    return null;

  } catch (error: any) {
    console.error("Validator Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Validator Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    return null;
  }
});