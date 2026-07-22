// functions/src/adaptiveValidationService.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateAdaptiveQuestions = onCall({
    memory: "512MiB",
    timeoutSeconds: 120,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { formData, trackName, aiPromptConfig, stepTitle, stepDescription, templateId, stepIndex } = request.data;
    if (!formData) throw new HttpsError("invalid-argument", "Data formulir tidak ditemukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const db = getFirestore(admin.app(), "curation");

      const persona = aiPromptConfig?.aiPersona || "Asesor Profesional & Auditor Analitis";
      const strictness = aiPromptConfig?.gradingStrictness || "standard";

      // 1. Ekstrak teks penting dari data sebelumnya untuk query embedding
      const textData: Record<string, any> = {};
      for (const key in formData) {
        if (typeof formData[key] !== 'string' || !formData[key].startsWith('http')) {
          textData[key] = formData[key];
        }
      }
      const contextString = JSON.stringify(textData);

      // 2. RAG STRATEGY: Cari kandidat pertanyaan dari adaptive_question_banks via Vector Search
      let candidateQuestions: any[] = [];
      try {
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embedModel.embedContent(`Track: ${trackName}, Step: ${stepTitle}, Data: ${contextString}`);
        const queryVector = embedResult.embedding.values;

        const bankQuery = db.collection('adaptive_question_banks')
          .where('templateId', '==', templateId || 'general')
          .where('stepIndex', '==', stepIndex || 1)
          .findNearest('embedding', admin.firestore.FieldValue.vector(queryVector), {
            limit: 15,
            distanceMeasure: 'COSINE'
          });

        const snap = await bankQuery.get();
        snap.forEach(doc => {
          candidateQuestions.push(doc.data().questionData);
        });
      } catch (vectorErr) {
        console.warn("Vector search bank soal dilewati/gagal (Non-Fatal):", vectorErr);
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        systemInstruction: `Anda adalah ${persona}. Tugas Anda merancang atau memilih instrumen pertanyaan kuesioner dinamis secara real-time. Output WAJIB berupa array JSON berisi objek 'FormField'.`,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "label", "type", "required", "gridSpan"],
              properties: {
                id: { type: SchemaType.STRING, description: "ID unik, huruf kecil tanpa spasi" },
                label: { type: SchemaType.STRING, description: "Pertanyaan spesifik dan tajam." },
                description: { type: SchemaType.STRING, description: "Konteks alasan mengapa AI menanyakan ini." },
                type: { type: SchemaType.STRING, description: "Pilih: text, textarea, number, select, radio, checkbox, file" },
                required: { type: SchemaType.BOOLEAN },
                gridSpan: { type: SchemaType.INTEGER, description: "Wajib diisi 2" },
                fileAccept: { type: SchemaType.STRING },
                options: { 
                  type: SchemaType.ARRAY, 
                  items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                      label: { type: SchemaType.STRING }, 
                      weight: { type: SchemaType.INTEGER } 
                    } 
                  } 
                },
                showIf: { 
                  type: SchemaType.OBJECT, 
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

      let prompt = "";
      if (candidateQuestions.length >= 5) {
        // AI MODE SELECTOR (Irit Token - Low Cost)
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Judul Seksi: "${stepTitle}"
          Deskripsi Seksi: "${stepDescription || '-'}"
          
          BERIKUT ADALAH KANDIDAT PERTANYAAN DARI BANK SOAL:
          ${JSON.stringify(candidateQuestions)}

          INSTRUKSI: Pilih 4 hingga 6 pertanyaan TERBAIK dan PALING RELEVAN dari daftar kandidat di atas yang paling cocok dengan data peserta berikut:
          ${contextString}
          Jangan buat pertanyaan baru, cukup pilih dan sesuaikan array JSON dari kandidat terpilih.
        `;
      } else {
        // AI MODE CREATOR (Membuat dari nol karena bank soal masih sedikit)
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Tingkat Keketatan: ${strictness}
          Data Jawaban Peserta Sebelumnya: ${contextString}

          TUGAS MERANCANG PERTANYAAN UNTUK SEKSI:
          - Judul Seksi: "${stepTitle}"
          - Deskripsi Seksi: "${stepDescription || '-'}"

          INSTRUKSI:
          1. Rancang 4 hingga 8 pertanyaan baru yang tajam dan kontekstual.
          2. Gunakan kombinasi tipe input (radio/checkbox berbobot, number, textarea, dan file dengan showIf).
          3. Pastikan format JSON valid sesuai schema.
        `;
      }

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }
      
      const dynamicFields = JSON.parse(rawText);

      // 3. BACKGROUND HARVESTING: Simpan pertanyaan baru ke adaptive_question_banks & Vector DB
      if (candidateQuestions.length < 5 && Array.isArray(dynamicFields)) {
        try {
          const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
          for (const field of dynamicFields) {
            const textToEmbed = `Track: ${trackName}, Step: ${stepTitle}, Label: ${field.label}`;
            const embRes = await embedModel.embedContent(textToEmbed);
            const vectorVal = embRes.embedding.values;

            const bankDocRef = db.collection('adaptive_question_banks').doc();
            await bankDocRef.set({
              templateId: templateId || 'general',
              stepIndex: stepIndex || 1,
              stepTitle: stepTitle,
              questionData: field,
              embedding: admin.firestore.FieldValue.vector(vectorVal),
              usageCount: 1,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (saveErr) {
          console.warn("Gagal menyimpan bank soal baru (Non-Fatal):", saveErr);
        }
      }

      return { success: true, fields: dynamicFields };

    } catch (error: any) {
      console.error("Gagal men-generate form adaptif:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI form.");
    }
  }
);