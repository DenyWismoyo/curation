import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { buildMegaAgentPrompt } from "../../../prompts/formBuilderPrompt";

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

import { withRetry } from "../../../shared/utils/retry";

export const executeFabricator = async (
  templateId: string,
  afterData: any,
  templateRef: admin.firestore.DocumentReference
): Promise<any> => {
  try {
    const stepOutlines = afterData.stepOutlinesCache || [];
    const researchNotes = afterData.researchNotesCache || "";
    const aiPromptConfig = afterData.aiPromptConfig || {};
    const trackName = afterData.trackName || "Asesmen Umum";
    const archetypeInstruction = afterData.formBuilderInstruction || "";
    const promptImpactMode = aiPromptConfig.promptImpactMode || "bold";
    const impactGuidance = promptImpactMode === "soft"
      ? "Gunakan diksi lebih halus, aman, dan empatik sambil tetap jelas."
      : promptImpactMode === "aggressive"
        ? "Gunakan diksi sangat tajam, direct, dan high-impact untuk menggali informasi penting tanpa basa-basi."
        : "Gunakan diksi tegas, profesional, dan persuasif dengan keseimbangan emosi dan kredibilitas.";

    await logToTerminal(templateRef, `FASE 2: Fabricator Agent (Gemini 2.5 Flash) dikerahkan. Memproduksi ${stepOutlines.length} seksi formulir...`, "info");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const sectionModel = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            required: ["id", "label", "type", "required", "gridSpan", "aiReasoning"],
            properties: {
              id: { type: SchemaType.STRING }, label: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING }, required: { type: SchemaType.BOOLEAN },
              placeholder: { type: SchemaType.STRING }, description: { type: SchemaType.STRING },
              aiReasoning: { type: SchemaType.STRING },
              gridSpan: { type: SchemaType.INTEGER }, fileAccept: { type: SchemaType.STRING },
              weightMultiplier: { type: SchemaType.INTEGER, description: "Bobot ekstra (1, 2, 3, atau 5)" },
              validation: {
                type: SchemaType.OBJECT,
                properties: {
                  min: { type: SchemaType.NUMBER },
                  max: { type: SchemaType.NUMBER },
                  minLength: { type: SchemaType.INTEGER },
                  maxLength: { type: SchemaType.INTEGER },
                  customErrorMessage: { type: SchemaType.STRING }
                }
              },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } } } },
              showIf: {
                type: SchemaType.OBJECT,
                required: ["fieldId"],
                properties: { 
                  fieldId: { type: SchemaType.STRING }, 
                  operator: { type: SchemaType.STRING, description: "equals, not_equals, greater_than, less_than" },
                  value: { type: SchemaType.STRING },
                  equals: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    });

    const baseInstructions = buildMegaAgentPrompt({
      trackName,
      config: aiPromptConfig,
      archetypeInstruction,
      specificTargetContext: afterData.specificTargetContext,
      methodologyContext: afterData.methodologyContext
    });

    // ====================================================================
    // PERBAIKAN: Sub-Agen Profiler (Injeksi Langkah 1)
    // ====================================================================
    const audienceType = aiPromptConfig?.targetAudience || 'company';
    let identityContext = "";

    const purpose = aiPromptConfig?.formPurpose || 'assessment';

    // 1. Tentukan Label Cerdas (Smart Label Injection) berdasarkan Target Audiens & Purpose
    let namaUsahaLabel = "Nama Usaha / Organisasi / Entitas";
    let namaUsahaPlaceholder = "Contoh: PT. Teknologi Masa Depan";

    let namaPengisiLabel = "Nama Lengkap Pengisi Form";
    let namaPengisiPlaceholder = "Contoh: Budi Santoso";
    let showNamaPengisi = true;

    if (audienceType === 'individual' || audienceType === 'student') {
      namaUsahaLabel = "Nama Lengkap Anda";
      namaUsahaPlaceholder = "Sesuai KTP/Identitas Resmi";
      showNamaPengisi = false; // Individu tidak butuh redundansi nama
    } else if (audienceType === 'government') {
      namaUsahaLabel = "Nama Instansi / Dinas / Desa";
      namaUsahaPlaceholder = "Contoh: Dinas Kesehatan Provinsi X";
    } else if (audienceType === 'community') {
      namaUsahaLabel = "Nama Komunitas / Yayasan";
      namaUsahaPlaceholder = "Contoh: Yayasan Peduli Sesama";
    } else if (audienceType === 'startup') {
      namaUsahaLabel = "Nama Startup / Usaha";
      namaUsahaPlaceholder = "Contoh: TechEdu App";
    } else if (audienceType === 'umkm') {
      namaUsahaLabel = "Nama Usaha / Toko / Perusahaan";
      namaUsahaPlaceholder = "Contoh: Toko Kopi Sejahtera";
    }

    if (purpose === 'counseling') {
      namaUsahaLabel = "Nama Anda (Klien / Pasangan)";
      namaUsahaPlaceholder = "Contoh: Budi & Ani";
      showNamaPengisi = false;
    }

    // 2. Tentukan Konteks Profiler Dinamis Berbasis Topik (AI Generative Identity)
    await logToTerminal(templateRef, "Mengunci Seksi 1 (Data Profil Identitas Dinamis) melalui Profiler Sub-Agent...", "info");

    const profilerPrompt = `
      Anda adalah sub-agen Profiler Ahli. Tugas Anda adalah meracik 4-7 pertanyaan profil/identitas awal yang SANGAT SPESIFIK dan RELEVAN dengan konteks topik asesmen di bawah ini.
      Tujuannya agar agen penilai (evaluator) nantinya memiliki konteks subjek yang sangat kaya (seolah-olah sedang berbicara dengan teliti kepada manusia).
      
      INFORMASI ASESMEN:
      - Topik Utama (Track Name): "${trackName}"
      - Konteks Kustom: "${afterData.specificTargetContext || 'Umum'}"
      - Target Audiens: ${audienceType}
      - Tujuan Form: ${purpose}
      - Mode Kualitas Prompt: ${promptImpactMode}
      - Panduan Mode: ${impactGuidance}

      PANDUAN PENGGALIAN KONTEKS (JADIKAN INSPIRASI):
      - Jika Parenting / Konseling: Tanyakan usia anak, jumlah anak, atau tantangan utama pengasuhan saat ini.
      - Jika UMKM / Bisnis: Tanyakan nama/jenis produk unggulan, lama usaha, atau platform jualan (gunakan checkbox jika ada banyak).
      - Jika Konten Kreator: Tanyakan platform utama (TikTok/IG/dll), niche, jumlah follower estimasi.
      - Jika Pekerja / Karir: Tanyakan posisi spesifik, industri, atau fokus area keahlian.
      - Jika topik lainnya: Rancanglah pertanyaan cerdas Anda sendiri yang paling masuk akal untuk menembus kulit luar dari topik "${trackName}".

      ATURAN JSON (MUTLAK):
      - Format HARUS array JSON murni (Array of Objects).
      - Tiap objek Field WAJIB memiliki: id (camelCase unik), label (teks pertanyaan), type (text, number, select, radio, checkbox, textarea), required (wajib true), placeholder, gridSpan (wajib integer 12), dan aiReasoning (tujuan menggali info ini).
      - Jika tipe adalah "select", "radio", atau "checkbox", Anda WAJIB menyediakan array "options" yang berisi objek dengan properti "label" (string) dan "weight" (integer 0).
    `;
    let dynamicIdentityFields = [];
    try {
      const profilerResult = await sectionModel.generateContent(profilerPrompt);
      let rawJson = profilerResult.response.text().trim();
      if (rawJson.startsWith('```')) rawJson = rawJson.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      dynamicIdentityFields = JSON.parse(rawJson);
    } catch (e) {
      console.warn("Profiler failed, using default fields.", e);
    }

    // 3. Injeksi Paksa Seksi 1 dengan Smart Label
    const step1Fields = [
      { id: "namaUsaha", label: namaUsahaLabel, type: "text", required: true, gridSpan: 12, placeholder: namaUsahaPlaceholder, aiReasoning: "Identifikasi utama subjek asesmen (Mutlak)" }
    ];

    if (showNamaPengisi) {
      step1Fields.push({ id: "namaPengisi", label: namaPengisiLabel, type: "text", required: true, gridSpan: 12, placeholder: namaPengisiPlaceholder, aiReasoning: "Identifikasi penanggung jawab pengisian form (Mutlak)" });
    }

    const step1 = {
      stepNumber: 1,
      title: "Data Profil & Identitas",
      description: "Mohon lengkapi data profil dasar sebelum melanjutkan ke tahap asesmen. Data ini bersifat rahasia.",
      fields: [
        ...step1Fields,
        ...dynamicIdentityFields.map((f: any) => ({ ...f, gridSpan: 12, aiReasoning: "Kelengkapan data profil sekunder berbasis target audiens dan tujuan" }))
      ]
    };

    let rawFinalSteps: any[] = [step1]; // Injeksi Seksi 1 ke hasil akhir
    const batchSize = 3;

    for (let i = 0; i < stepOutlines.length; i += batchSize) {
      const batch = stepOutlines.slice(i, i + batchSize);

      await logToTerminal(templateRef, `Meracik Kuesioner Batch ${Math.ceil(i / batchSize) + 1}...`, "info");

      const batchPromises = batch.map(async (step: any, indexInBatch: number) => {
        const absoluteIndex = i + indexInBatch;
        const currentStepNumber = absoluteIndex + 2; // +2 karena Seksi 1 sudah diisi oleh Profiler

        // OPTIMASI TOKEN: Jika Mode Adaptif dan ini bukan Step pertama dari Architect, 
        // ATAU jika draftedQuestions memang kosong, kita bypass panggilan LLM.
        const isAdaptive = aiPromptConfig?.isAdaptive === true;
        const hasNoDraftedQuestions = !step.draftedQuestions || step.draftedQuestions.length === 0;
        
        if ((isAdaptive && absoluteIndex > 0) || hasNoDraftedQuestions) {
          console.log(`[Fabricator] Bypassing LLM untuk Seksi ${currentStepNumber} (Adaptive/Empty)`);
          return { 
            stepNumber: currentStepNumber, 
            title: step.title, 
            description: step.description, 
            fields: [] 
          };
        }

        const sectionPrompt = `
          ${baseInstructions}
          
          TUGAS UTAMA: PENERJEMAH JSON (STRICT JSON TRANSLATOR)
          Anda saat ini bertugas sebagai agen penerjemah dari Draf Pertanyaan (Natural Language) menjadi Skema JSON FormField yang valid.
          Draf pertanyaan ini sudah dirancang dengan sangat matang dan tajam oleh Architect Agent (Gemini Pro) untuk Seksi ${currentStepNumber}: "${step.title}".
          
          DRAF PERTANYAAN DARI ARCHITECT AGENT (YANG HARUS DITERJEMAHKAN):
          ${JSON.stringify(step.draftedQuestions || [])}
          
          INSTRUKSI TRANSLASI JSON:
          1. Hasilkan "id" camelCase SANGAT UNIK untuk setiap pertanyaan (misal: "pendapatanTahunan"). DILARANG KERAS menggunakan "id" yang sama lebih dari satu kali dalam seluruh array ini. Pastikan 100% tidak ada duplikasi "id"!
          2. Gunakan "questionText" sebagai "label".
          3. ADMIN'S X-RAY VISION (MUTLAK): Salin persis teks dari "interrogationGoal" ke dalam properti "aiReasoning". Ini wajib ada!
          4. SMART PLACEHOLDER (MUTLAK): Gunakan teks dari "suggestedPlaceholder" ke dalam properti "placeholder".
          5. Konversi "suggestedType" ke "type" form builder (Valid: text, textarea, number, date, select, radio, checkbox, file).
          6. OPSI BERBOBOT: Jika tipe adalah radio, checkbox, atau select, Anda WAJIB meracik array "options" (berisi "label" dan "weight" 0-100).
          7. BOBOT EKSTRA (WEIGHT MULTIPLIER): Jika pertanyaan ditandai "isCritical": true di draf, berikan "weightMultiplier": 2, 3, atau 5 sesuai tingkat krusialnya. Jika biasa saja, abaikan atau set 1.
          8. DATA HYGIENE (VALIDASI): Untuk input number, berikan "validation" (min/max) jika logis (misal umur min 18). Untuk text, berikan minLength jika butuh jawaban panjang.
          9. THE AUDITOR'S TRAP (EKSPANSI SHOW-IF BERANTAI): Jika draf memiliki "followUpLogic":
             - Anda WAJIB memecahnya menjadi MULTIPLE FIELD dalam JSON. 
             - SANGAT KRITIS: Setiap Field Lanjutan WAJIB MEMILIKI "id" YANG BERBEDA dari field utamanya! Dilarang keras memakai "id" yang sama berulang kali. (Contoh Benar: id pemicu "punyaSertifikasi", id lanjutan "uploadBuktiSertifikasi").
             - Rangkai logika jebakan secara berantai (Chaining). Contoh: Field A memicu Field B, lalu jawaban di Field B memicu Field C.
             - Gunakan properti "showIf" pada setiap Field Lanjutan. Di dalam "showIf", tentukan "fieldId" ke ID pendahulunya, "operator" (bisa 'equals', 'greater_than', dll), dan "value" pemicunya (atau "equals" untuk backward compatibility).
             - Gunakan tipe interaktif untuk Field Lanjutan ("file" untuk tagih dokumen, "textarea" untuk tagih penjelasan).
             
          ATURAN ANTI-DUPLIKASI MUTLAK: DILARANG KERAS menanyakan Identitas Dasar (Nama, Nama Usaha, Email, Telepon) di seksi ini! Seksi Identitas sudah diselesaikan.
        `;

        try {
          const sectionResult = await withRetry(() => sectionModel.generateContent(sectionPrompt));
          let rawJsonText = sectionResult.response.text().trim();
          if (rawJsonText.startsWith('\`\`\`')) rawJsonText = rawJsonText.replace(/^\`\`\`(json)?/gi, '').replace(/\`\`\`$/g, '').trim();

          return { stepNumber: currentStepNumber, title: step.title, description: step.description, fields: JSON.parse(rawJsonText) };
        } catch (error: any) {
          await logToTerminal(templateRef, `Peringatan: Gagal meracik Seksi ${currentStepNumber} "${step.title}".`, "error");
          return { stepNumber: currentStepNumber, title: step.title, description: "Gagal memuat otomatis.", fields: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      rawFinalSteps.push(...batchResults);
    }

    // ====================================================================
    // SAFEGUARD: Post-Processing Anti-Duplikasi ID (Global)
    // ====================================================================
    const globalIdSet = new Set<string>();
    for (const step of rawFinalSteps) {
      if (step.fields && Array.isArray(step.fields)) {
        const idMapping: Record<string, string> = {};
        
        // 1. Validasi dan pastikan unik
        for (const field of step.fields) {
          if (!field.id) field.id = "field_" + Math.random().toString(36).substring(2, 9);
          
          let originalId = field.id;
          let newId = originalId;
          let counter = 1;
          while (globalIdSet.has(newId)) {
            newId = `${originalId}_${counter}`;
            counter++;
          }
          
          if (newId !== originalId) {
            idMapping[originalId] = newId;
            field.id = newId;
          }
          globalIdSet.add(newId);
        }
        
        // 2. Update referensi showIf jika ada ID yang berubah
        for (const field of step.fields) {
          if (field.showIf && field.showIf.fieldId && idMapping[field.showIf.fieldId]) {
            field.showIf.fieldId = idMapping[field.showIf.fieldId];
          }
        }
      }
    }

    await logToTerminal(templateRef, "Seluruh seksi formulir berhasil diracik dan divalidasi.", "success");

    const updateData = {
      rawStepsCache: rawFinalSteps,
      aiGenerationStatus: {
        phase: "FABRICATING",
        message: "Produksi kuesioner selesai. Mengalihkan komando ke Validator Agent untuk QA Logika...",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    await templateRef.update(updateData);

    return { success: true, nextPhase: "FABRICATING" };

  } catch (error: any) {
    console.error("Fabricator Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Fabricator Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    throw error;
  }
};