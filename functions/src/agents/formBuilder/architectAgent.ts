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

export const formBuilderArchitectAgent = onDocumentUpdated({
  database: "curation", 
  document: "form_templates/{templateId}",
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (afterData?.aiGenerationStatus?.phase !== "INITIATING" || beforeData?.aiGenerationStatus?.phase === "INITIATING") {
    return null;
  }

  const templateRef = event.data?.after.ref;
  if (!templateRef) return null;

  try {
    await logToTerminal(templateRef, "FASE 1: Architect Agent (Gemini 3.1 Pro) diaktifkan. Melakukan penetrasi jaringan & riset blueprint...", "info");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
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
              // KUNCI PERBAIKAN: Sengaja tidak memasukkan targetAudience & formPurpose agar AI tidak berhalusinasi merubahnya
              required: ["aiPersona", "assessmentGoal", "gradingStrictness", "reportTone", "expectedMetrics", "expectedAnalysisBlocks", "expectedRecommendations", "riskFramework", "customReadinessTiers", "customScoringRubric", "negativePrompts", "formatInstructions", "customSystemPrompt", "actionPlanBehavior"],
              properties: {
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
                actionPlanBehavior: { type: SchemaType.STRING },
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

    const trackName = afterData.trackName || "Asesmen Umum";
    const currentConfigStr = Object.keys(afterData.aiPromptConfig || {}).length > 0
       ? JSON.stringify(afterData.aiPromptConfig, null, 2)
       : "Belum ada konfigurasi awal, rumuskan dari nol.";

    const targetMetricCount = afterData.aiPromptConfig?.targetMetricCount || 8;
    const targetBlockCount = afterData.aiPromptConfig?.targetBlockCount || 6;
    const targetTierCount = afterData.aiPromptConfig?.targetTierCount || 4;
    const targetRecCount = afterData.aiPromptConfig?.targetRecommendationCount || 5;
    const specificTargetContext = afterData.specificTargetContext || 'Tergantung konfigurasi targetAudience, dilarang meleset dari ini.';
    const methodologyContext = afterData.methodologyContext || 'Standar Global Terbaik yang paling relevan dengan profil.';

    const masterPrompt = `
      Anda adalah Chief Research Officer tingkat Enterprise. Topik program/asesmen: "${trackName}".
      
      KONTEKS ANCHOR (ACUAN MUTLAK PENELITIAN ANDA):
      - Profil Spesifik Subjek Asesmen: ${specificTargetContext}
      - Metodologi / Pendekatan: ${methodologyContext}
      
      LANGKAH 1: PENYEMPURNAAN "OTAK AI" (aiPromptConfig)
      Berikut adalah draf konfigurasi dari klien:
      ${currentConfigStr}
      
      Tugas: Lakukan web search untuk standar industri terbaik yang SELARAS dengan Konteks Anchor, lalu SEMPURNAKAN draf tersebut ke dalam properti "aiPromptConfig".
      
      ATURAN KETAT VOLUME OUTPUT:
      - expectedMetrics: TEPAT ${targetMetricCount} metrik.
      - expectedAnalysisBlocks: TEPAT ${targetBlockCount} blok analisis. (Format 'Judul Blok: Sub-poin 1, Sub-poin 2')
      - customReadinessTiers: TEPAT ${targetTierCount} tingkatan (tiers).
      - expectedRecommendations: TEPAT ${targetRecCount} rekomendasi.
      
      LANGKAH 2: PEMBUATAN KERANGKA FORMULIR (stepOutlines)
      Berdasarkan "aiPromptConfig" yang BARU SAJA Anda sempurnakan, susun 5 hingga 8 Seksi kuesioner yang 100% sejajar dengan metrik tersebut.
    `;

    const masterResult = await masterModel.generateContent(masterPrompt);
    const blueprint = JSON.parse(masterResult.response.text().trim());

    await logToTerminal(templateRef, "Otak AI dan Master Blueprint berhasil disempurnakan!", "success");

    // =========================================================================
    // KUNCI PERBAIKAN: MERGE DATA (MELINDUNGI SETTINGAN UI DARI OVERWRITE AI)
    // =========================================================================
    const existingConfig = afterData.aiPromptConfig || {};
    
    const finalAiPromptConfig = {
      ...existingConfig,           // 1. Bawa semua data lama terlebih dahulu
      ...blueprint.aiPromptConfig, // 2. Timpa dengan kecerdasan / riset baru dari AI
      
      // 3. KUNCI ABSOLUT: Timpa kembali secara paksa dengan settingan UI Admin 
      // agar AI tidak bisa menghapus, menimpa, atau berhalusinasi!
      formPurpose: existingConfig.formPurpose || 'assessment',
      targetAudience: existingConfig.targetAudience || 'company',
      customUiLabels: existingConfig.customUiLabels || {},
      isAdaptive: existingConfig.isAdaptive || false
    };

    // Simpan konfigurasi yang telah digabungkan ke database
    await templateRef.update({
      aiPromptConfig: finalAiPromptConfig,
      stepOutlinesCache: blueprint.stepOutlines,
      researchNotesCache: blueprint.researchNotes,
      aiGenerationStatus: {
        phase: "RESEARCHING", 
        message: "Konfigurasi Otak AI selesai. Mengalihkan komando ke Fabricator Agent...",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    return null;

  } catch (error: any) {
    console.error("Architect Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Architect Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    return null;
  }
});