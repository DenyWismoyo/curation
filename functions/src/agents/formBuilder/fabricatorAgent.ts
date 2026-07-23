import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { buildMegaAgentPrompt } from "../../promt/formBuilderPrompt";

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

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

export const formBuilderFabricatorAgent = onDocumentUpdated({
  database: "curation", 
  document: "form_templates/{templateId}",
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (afterData?.aiGenerationStatus?.phase !== "RESEARCHING" || beforeData?.aiGenerationStatus?.phase === "RESEARCHING") {
    return null;
  }

  const templateRef = event.data?.after.ref;
  if (!templateRef) return null;

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
            required: ["id", "label", "type", "required", "gridSpan"],
            properties: {
              id: { type: SchemaType.STRING }, label: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING }, required: { type: SchemaType.BOOLEAN },
              placeholder: { type: SchemaType.STRING }, description: { type: SchemaType.STRING },
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

    const baseInstructions = buildMegaAgentPrompt({ trackName, config: aiPromptConfig, archetypeInstruction });
    
    // ====================================================================
    // PERBAIKAN: Deteksi Audiens untuk Pertanyaan Identitas yang Dinamis
    // ====================================================================
    const audienceType = aiPromptConfig?.targetAudience || 'company';
    let identityContext = "";
    
    if (audienceType === 'individual' || audienceType === 'student') {
        identityContext = "Buat 2-3 pertanyaan identitas tambahan yang relevan dengan personal/karir (misal: Usia, Pendidikan Terakhir, Profesi, atau Domisili).";
    } else if (audienceType === 'government') {
        identityContext = "Buat 2-3 pertanyaan identitas tambahan yang relevan dengan ASN/Pemerintahan (misal: NIP, Jabatan, Golongan, atau Nama Instansi/Seksi).";
    } else if (audienceType === 'community') {
        identityContext = "Buat 2-3 pertanyaan identitas tambahan yang relevan dengan komunitas (misal: Peran di Komunitas, Lama Bergabung, atau Fokus Isu Sosial).";
    } else if (audienceType === 'startup' || audienceType === 'umkm') {
        identityContext = "Buat 2-3 pertanyaan identitas tambahan yang relevan dengan bisnis (misal: Tahun Berdiri, Kategori Produk/Jasa, atau Skala Operasional/Karyawan).";
    } else {
        identityContext = "Buat 2-3 pertanyaan identitas tambahan yang relevan dengan B2B/Korporasi (misal: Jabatan Pengisi Form, Sektor Industri, atau Skala Perusahaan).";
    }

    let rawFinalSteps: any[] = [];
    const batchSize = 3; 

    for (let i = 0; i < stepOutlines.length; i += batchSize) {
      const batch = stepOutlines.slice(i, i + batchSize);
      
      await logToTerminal(templateRef, `Meracik Kuesioner Batch ${Math.ceil(i/batchSize) + 1}...`, "info");

      const batchPromises = batch.map(async (step: any, indexInBatch: number) => {
        const absoluteIndex = i + indexInBatch;
        const isFirstStep = absoluteIndex === 0;

        // PERBAIKAN: Prompt injeksi aturan dilarang menanyakan email & telepon
        const sectionPrompt = `
          ${baseInstructions}
          HASIL RISET STANDAR TERBARU: ${researchNotes}
          ROLEPLAY MUTLAK: Anda saat ini berperan sebagai "${step.expertPersona}". 
          Rancang 8-12 pertanyaan spesifik HANYA UNTUK Seksi ${absoluteIndex + 1}: "${step.title}".
          
          ${isFirstStep ? `
          ATURAN SEKSI PERTAMA (DATA PROFIL DASAR):
          1. Dua (2) Field pertama WAJIB ber-ID persis: "namaUsaha" dan "namaPengisi".
          2. KONTEKS DINAMIS: ${identityContext}
          3. PANTANGAN MUTLAK: DILARANG KERAS menanyakan "Email", "Kata Sandi", "Nomor Telepon", atau "WhatsApp". Sistem kami sudah mendeteksi akun Google dan data kontak mereka secara otomatis di layar pendaftaran!
          ` : `
          ATURAN ANTI-DUPLIKASI MUTLAK: DILARANG KERAS menanyakan kembali Identitas Dasar di seksi ini. Fokus ke pendalaman kasus sesuai topik seksi ini.
          `}
        `;

        try {
          const sectionResult = await withRetry(() => sectionModel.generateContent(sectionPrompt));
          let rawJsonText = sectionResult.response.text().trim();
          if (rawJsonText.startsWith('```')) rawJsonText = rawJsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
          
          return { stepNumber: absoluteIndex + 1, title: step.title, description: step.description, fields: JSON.parse(rawJsonText) };
        } catch (error: any) {
          await logToTerminal(templateRef, `Peringatan: Gagal meracik Seksi ${absoluteIndex + 1} "${step.title}".`, "error");
          return { stepNumber: absoluteIndex + 1, title: step.title, description: "Gagal memuat otomatis.", fields: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      rawFinalSteps.push(...batchResults);
    }

    await logToTerminal(templateRef, "Seluruh seksi formulir berhasil diracik.", "success");

    await templateRef.update({
      rawStepsCache: rawFinalSteps,
      aiGenerationStatus: {
        phase: "FABRICATING", 
        message: "Produksi kuesioner selesai. Mengalihkan komando ke Validator Agent untuk QA Logika...",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    return null;

  } catch (error: any) {
    console.error("Fabricator Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `Fabricator Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    return null;
  }
});