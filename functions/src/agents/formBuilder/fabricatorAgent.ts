import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { buildMegaAgentPrompt } from "../../prompt/formBuilderPrompt";

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

import { withRetry } from "../../utils/retry";

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

    await logToTerminal(templateRef, `FASE 2: Fabricator Agent (Gemini 2.5 Flash) dikerahkan. Memproduksi ${stepOutlines.length} seksi formulir...`, "info");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const sectionModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } } } },
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
    
    if (audienceType === 'individual' || audienceType === 'student') {
        identityContext = "Buat 2 pertanyaan identitas tambahan yang relevan dengan personal/karir (misal: Usia atau Profesi).";
    } else if (audienceType === 'government') {
        identityContext = "Buat 2 pertanyaan identitas tambahan yang relevan dengan ASN/Pemerintahan (misal: NIP atau Jabatan/Instansi).";
    } else if (audienceType === 'community') {
        identityContext = "Buat 2 pertanyaan identitas tambahan yang relevan dengan komunitas (misal: Peran di Komunitas atau Fokus Isu Sosial).";
    } else if (audienceType === 'startup' || audienceType === 'umkm') {
        identityContext = "Buat 2 pertanyaan identitas tambahan yang relevan dengan bisnis (misal: Kategori Produk/Jasa atau Skala Operasional/Karyawan).";
    } else {
        identityContext = "Buat 2 pertanyaan identitas tambahan yang relevan dengan B2B/Korporasi (misal: Jabatan Pengisi Form atau Sektor Industri).";
    }

    await logToTerminal(templateRef, "Mengunci Seksi 1 (Data Profil Identitas) melalui Profiler Sub-Agent...", "info");

    const profilerPrompt = `
      Anda adalah sub-agen pembuat formulir identitas.
      Target Audiens: ${audienceType}.
      Tugas: ${identityContext}
      Format output HARUS array JSON sesuai skema form (hanya array of object dengan properti: id, label, type, required, placeholder).
      Pastikan id unik bergaya camelCase. required wajib true. type gunakan "text" atau "select".
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

    // Injeksi Paksa Seksi 1
    const step1 = {
      stepNumber: 1,
      title: "Data Profil & Identitas",
      description: "Mohon lengkapi data profil dasar Anda sebelum melanjutkan ke tahap asesmen. Data ini bersifat rahasia.",
      fields: [
        { id: "namaUsaha", label: "Nama Usaha / Organisasi / Entitas", type: "text", required: true, gridSpan: 12, placeholder: "Contoh: PT. Teknologi Masa Depan", aiReasoning: "Identifikasi utama subjek asesmen (Mutlak)" },
        { id: "namaPengisi", label: "Nama Lengkap Pengisi Form", type: "text", required: true, gridSpan: 12, placeholder: "Contoh: Budi Santoso", aiReasoning: "Identifikasi penanggung jawab pengisian form (Mutlak)" },
        ...dynamicIdentityFields.map((f: any) => ({...f, gridSpan: 12, aiReasoning: "Kelengkapan data profil sekunder berbasis target audiens"}))
      ]
    };

    let rawFinalSteps: any[] = [step1]; // Injeksi Seksi 1 ke hasil akhir
    const batchSize = 3;

    for (let i = 0; i < stepOutlines.length; i += batchSize) {
      const batch = stepOutlines.slice(i, i + batchSize);
      
      await logToTerminal(templateRef, `Meracik Kuesioner Batch ${Math.ceil(i/batchSize) + 1}...`, "info");

      const batchPromises = batch.map(async (step: any, indexInBatch: number) => {
        const absoluteIndex = i + indexInBatch;
        const currentStepNumber = absoluteIndex + 2; // +2 karena Seksi 1 sudah diisi oleh Profiler

        const sectionPrompt = `
          ${baseInstructions}
          
          TUGAS UTAMA: PENERJEMAH JSON (STRICT JSON TRANSLATOR)
          Anda saat ini bertugas sebagai agen penerjemah dari Draf Pertanyaan (Natural Language) menjadi Skema JSON FormField yang valid.
          Draf pertanyaan ini sudah dirancang dengan sangat matang dan tajam oleh Architect Agent (Gemini Pro) untuk Seksi ${currentStepNumber}: "${step.title}".
          
          DRAF PERTANYAAN DARI ARCHITECT AGENT (YANG HARUS DITERJEMAHKAN):
          ${JSON.stringify(step.draftedQuestions || [])}
          
          INSTRUKSI TRANSLASI JSON:
          1. Hasilkan "id" camelCase unik (misal: "pendapatanTahunan").
          2. Gunakan "questionText" sebagai "label".
          3. ADMIN'S X-RAY VISION (MUTLAK): Salin persis teks dari "interrogationGoal" ke dalam properti "aiReasoning". Ini wajib ada!
          4. SMART PLACEHOLDER (MUTLAK): Gunakan teks dari "suggestedPlaceholder" ke dalam properti "placeholder".
          5. Konversi "suggestedType" ke "type" form builder (Valid: text, textarea, number, date, select, radio, checkbox, file).
          6. OPSI BERBOBOT: Jika tipe adalah radio, checkbox, atau select, Anda WAJIB meracik array "options" (berisi "label" dan "weight" 0-100).
          7. THE AUDITOR'S TRAP (EKSPANSI SHOW-IF BERANTAI): Jika draf memiliki "followUpLogic":
             - Anda WAJIB memecahnya menjadi MULTIPLE FIELD dalam JSON. 
             - SANGAT KRITIS: Setiap Field Lanjutan WAJIB MEMILIKI "id" YANG BERBEDA dari field utamanya! Dilarang keras memakai "id" yang sama berulang kali. (Contoh Benar: id pemicu "punyaSertifikasi", id lanjutan "uploadBuktiSertifikasi").
             - Rangkai logika jebakan secara berantai (Chaining). Contoh: Field A memicu Field B, lalu jawaban di Field B memicu Field C.
             - Gunakan properti "showIf" pada setiap Field Lanjutan. Di dalam "showIf", pastikan "fieldId" merujuk ke ID field pendahulunya, dan "equals" SAMA PERSIS dengan teks opsi yang memicunya (contoh: "Ya").
             - Gunakan tipe interaktif untuk Field Lanjutan ("file" untuk tagih dokumen, "textarea" untuk tagih penjelasan).
             
          ATURAN ANTI-DUPLIKASI MUTLAK: DILARANG KERAS menanyakan Identitas Dasar (Nama, Nama Usaha, Email, Telepon) di seksi ini! Seksi Identitas sudah diselesaikan.
        `;

        try {
          const sectionResult = await withRetry(() => sectionModel.generateContent(sectionPrompt));
          let rawJsonText = sectionResult.response.text().trim();
          if (rawJsonText.startsWith('```')) rawJsonText = rawJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
          
          return { stepNumber: currentStepNumber, title: step.title, description: step.description, fields: JSON.parse(rawJsonText) };
        } catch (error: any) {
          await logToTerminal(templateRef, `Peringatan: Gagal meracik Seksi ${currentStepNumber} "${step.title}".`, "error");
          return { stepNumber: currentStepNumber, title: step.title, description: "Gagal memuat otomatis.", fields: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      rawFinalSteps.push(...batchResults);
    }

    await logToTerminal(templateRef, "Seluruh seksi formulir berhasil diracik.", "success");

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