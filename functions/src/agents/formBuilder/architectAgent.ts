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

export const executeArchitect = async (
  templateId: string,
  afterData: any,
  templateRef: admin.firestore.DocumentReference
): Promise<any> => {
  try {
    await logToTerminal(templateRef, "FASE 1: Architect Agent (Gemini 3.1 Pro) diaktifkan. Melakukan penetrasi jaringan & riset blueprint...", "info");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const masterModel = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview",
      tools: [{ googleSearch: {} } as any],
      generationConfig: {
        temperature: 0.2, // Diturunkan agar kerangka struktur JSON lebih deterministik
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["researchNotes", "aiPromptConfig", "stepOutlines"],
          properties: {
            researchNotes: { type: SchemaType.STRING },
            aiPromptConfig: {
              type: SchemaType.OBJECT,
              // KUNCI PERBAIKAN: Tidak memasukkan targetAudience & formPurpose agar AI tidak berhalusinasi merubahnya
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
                researchSourcesCited: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                // PERBAIKAN 1: Menambahkan customUiLabels ke dalam skema agar AI bisa memahaminya
                customUiLabels: {
                  type: SchemaType.OBJECT,
                  properties: {
                    scoreLabel: { type: SchemaType.STRING },
                    swotLabel: { type: SchemaType.STRING },
                    riskLabel: { type: SchemaType.STRING },
                    roadmapLabel: { type: SchemaType.STRING },
                    executionLabel: { type: SchemaType.STRING }
                  }
                }
              }
            },
            stepOutlines: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                required: ["title", "description", "focusArea", "expertPersona", "targetMetrics", "draftedQuestions"],
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  focusArea: { type: SchemaType.STRING },
                  expertPersona: { type: SchemaType.STRING },
                  targetMetrics: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "Metrik dari expectedMetrics yang diukur di seksi ini"
                  },
                  draftedQuestions: {
                    type: SchemaType.ARRAY,
                    description: "Daftar 8-12 pertanyaan spesifik yang dirancang secara tajam dan berkesinambungan",
                    items: {
                      type: SchemaType.OBJECT,
                      required: ["interrogationGoal", "questionText", "suggestedType", "suggestedPlaceholder"],
                      properties: {
                        interrogationGoal: { type: SchemaType.STRING, description: "Alasan psikologis mengapa pertanyaan ini diajukan dan hubungannya dengan metrik" },
                        questionText: { type: SchemaType.STRING, description: "Teks pertanyaan aktual yang akan dibaca oleh user" },
                        suggestedType: { type: SchemaType.STRING, description: "Tipe input yang disarankan (contoh: text, textarea, select, radio_weight, file)" },
                        suggestedPlaceholder: { type: SchemaType.STRING, description: "Contoh jawaban dunia nyata yang sangat spesifik (Smart Placeholder)" },
                        followUpLogic: { type: SchemaType.STRING, description: "Instruksi jebakan logika/showIf multi-layer (contoh: 'Jika jawab Ya, tagih dokumen. Jika dokumen tidak ada, tagih justifikasi')" }
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

    const trackName = afterData.trackName || "Asesmen Umum";
    const existingConfig = afterData.aiPromptConfig || {};
    const currentConfigStr = Object.keys(existingConfig).length > 0 
       ? JSON.stringify(existingConfig, null, 2) 
       : "Belum ada konfigurasi awal, rumuskan dari nol.";

    const targetMetricCount = existingConfig.targetMetricCount || 8;
    const targetBlockCount = existingConfig.targetBlockCount || 6;
    const targetTierCount = existingConfig.targetTierCount || 4;
    const targetRecCount = existingConfig.targetRecommendationCount || 5;

    const specificTargetContext = afterData.specificTargetContext || 'Tergantung konfigurasi targetAudience, dilarang meleset dari ini.';
    const methodologyContext = afterData.methodologyContext || 'Standar Global Terbaik yang paling relevan dengan profil.';
    
    // ═══════════════════════════════════════════════════════════════════
    // PERBAIKAN: formBuilderInstruction sebagai instruksi prioritas tinggi
    // ═══════════════════════════════════════════════════════════════════
    const formBuilderInstruction = afterData.formBuilderInstruction || '';
    const mandatoryAdminInstruction = formBuilderInstruction.trim()
      ? `\n      ══════════════════════════════════════════════
      🔴 INSTRUKSI KHUSUS DARI ADMIN (PRIORITAS TERTINGGI — WAJIB DIEKSEKUSI):
      ${formBuilderInstruction}
      ══════════════════════════════════════════════
      PERINGATAN: Instruksi admin di atas adalah HUKUM TERTINGGI yang tidak boleh diabaikan atau dikurangi. 
      Jika ada konflik antara instruksi admin dan aturan umum lainnya, SELALU DAHULUKAN instruksi admin.`
      : '';

    // PERBAIKAN 2: Instruksi dinamis khusus untuk AI meracik label UI jika modenya "custom"
    const customUiInstruction = existingConfig.formPurpose === 'custom'
      ? "\n- MODE MANUAL (CUSTOM) TERDETEKSI: Anda WAJIB meracik ulang data 'customUiLabels' (scoreLabel, swotLabel, riskLabel, roadmapLabel, executionLabel). Buatlah istilah yang relevan, inovatif, dan berbahasa Indonesia untuk metrik UI."
      : "";

    const masterPrompt = `
      Anda adalah Chief Research Officer tingkat Enterprise. Topik program/asesmen: "${trackName}".
      ${mandatoryAdminInstruction}
      
      KONTEKS ANCHOR (ACUAN MUTLAK PENELITIAN ANDA):
      - Profil Spesifik Subjek Asesmen: ${specificTargetContext}
      - Metodologi / Pendekatan: ${methodologyContext}
      
      LANGKAH 1: PENYEMPURNAAN "OTAK AI" (aiPromptConfig)
      Berikut adalah draf konfigurasi dari klien:
      ${currentConfigStr}
      
      Tugas: Lakukan web search untuk standar industri terbaik yang SELARAS dengan Konteks Anchor, lalu SEMPURNAKAN draf tersebut ke dalam properti "aiPromptConfig".
      
      ATURAN KETAT VOLUME OUTPUT:
      - expectedMetrics: TEPAT ${targetMetricCount} metrik.
      - expectedAnalysisBlocks: TEPAT ${targetBlockCount} blok analisis. (Format '[NAMA TEMA/KATEGORI YANG RELEVAN]: Sub-poin 1, Sub-poin 2'. DILARANG KERAS menggunakan kata literal 'Judul Blok', gunakan nama topik analisis yang sesungguhnya)
      - customReadinessTiers: TEPAT ${targetTierCount} tingkatan (tiers).
      - expectedRecommendations: TEPAT ${targetRecCount} rekomendasi.${customUiInstruction}
      
      LANGKAH 2: PEMBUATAN KERANGKA FORMULIR (stepOutlines) & DRAFT PERTANYAAN (draftedQuestions)
      Berdasarkan "aiPromptConfig" yang BARU SAJA Anda sempurnakan, susun 5 hingga 8 Seksi kuesioner yang 100% sejajar dengan metrik tersebut.
      KRITIS: Setiap seksi WAJIB memiliki array "targetMetrics" yang berisi list metrik dari "expectedMetrics" yang akan DIUKUR melalui pertanyaan-pertanyaan di seksi tersebut. Pastikan SELURUH metrik di expectedMetrics terwakili minimal 1x di seluruh seksi.
      
      TUGAS UTAMA (DRAFTING PERTANYAAN): 
      Di dalam setiap seksi, Anda WAJIB mengisi array "draftedQuestions" dengan 8-12 pertanyaan. 
      Terapkan "Interrogation Logic" yang tajam dan profesional (sesuaikan dengan targetAudience dan gradingStrictness). 
      
      FITUR "WOW" YANG WAJIB ANDA IMPLEMENTASIKAN:
      1. THE AUDITOR'S TRAP: Rancang alur logika berantai pada properti 'followUpLogic'. Jika ini adalah asesmen yang ketat (strict), jangan hanya berhenti di 1 pertanyaan. Buat skenario berlapis (Contoh: "Jika Ya, minta dokumen. Jika dokumen di-upload, minta penjelasan teks mengapa dokumen tersebut valid").
      2. SMART PLACEHOLDERS: Isi properti 'suggestedPlaceholder' dengan contoh jawaban dunia nyata yang SANGAT SPESIFIK dan sesuai dengan industri target, bukan contoh murahan (Contoh Benar: "Misal: Kami menggunakan enkripsi AES-256 dan rotasi kunci AWS KMS tiap 90 hari").
    `;

    const masterResult = await masterModel.generateContent(masterPrompt);
    const blueprint = JSON.parse(masterResult.response.text().trim());

    await logToTerminal(templateRef, "Otak AI dan Master Blueprint berhasil disempurnakan!", "success");

    // =========================================================================
    // PERBAIKAN 3: MERGE DATA (MELINDUNGI SETTINGAN UI DARI OVERWRITE AI KECUALI MANUAL)
    // =========================================================================
    
    const finalAiPromptConfig = {
      ...existingConfig,           // 1. Bawa semua data lama terlebih dahulu
      ...blueprint.aiPromptConfig, // 2. Timpa dengan kecerdasan / riset baru dari AI
      
      // 3. KUNCI ABSOLUT: Pastikan target audience, purpose, dan adaptive tidak diganggu AI
      formPurpose: existingConfig.formPurpose || 'assessment',
      targetAudience: existingConfig.targetAudience || 'company',
      isAdaptive: existingConfig.isAdaptive || false
    };

    // LOGIKA PENENTU LABEL UI
    if (existingConfig.formPurpose === 'custom' && blueprint.aiPromptConfig?.customUiLabels) {
        // Jika mode manual, izinkan AI mengambil alih label UI
        finalAiPromptConfig.customUiLabels = blueprint.aiPromptConfig.customUiLabels;
    } else {
        // Jika bukan, paksakan menggunakan label dari UI Admin agar tidak tertimpa halusinasi
        finalAiPromptConfig.customUiLabels = existingConfig.customUiLabels || {};
    }

    // Simpan konfigurasi yang telah digabungkan ke database
    const updateData = {
      aiPromptConfig: finalAiPromptConfig,
      stepOutlinesCache: blueprint.stepOutlines,
      researchNotesCache: blueprint.researchNotes,
      aiGenerationStatus: {
        phase: "RESEARCHING", 
        message: "Konfigurasi Otak AI selesai. Mengalihkan komando ke Fabricator Agent...",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    await templateRef.update(updateData);

    return { success: true, nextPhase: "RESEARCHING" };

  } catch (error: any) {
    console.error("Architect Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Architect Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    throw error;
  }
};