// functions/src/fieldEnhancerService.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const enhanceFieldLogic = onCall({
    memory: "256MiB",
    timeoutSeconds: 60,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { trackName, templateId, currentField } = request.data;
    if (!currentField || !currentField.label) {
      throw new HttpsError("invalid-argument", "Data field mentah tidak ditemukan.");
    }

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const db = getFirestore(admin.app(), "curation");

      // 1. RAG STRATEGY: Cari referensi pertanyaan serupa di Vector DB
      let candidateContext = "";
      try {
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embedModel.embedContent(`Program: ${trackName}, Pertanyaan: ${currentField.label}`);
        const queryVector = embedResult.embedding.values;

        // Cari 3 pertanyaan paling relevan sebagai inspirasi AI
        const bankQuery = db.collection('adaptive_question_banks')
          .findNearest('embedding', admin.firestore.FieldValue.vector(queryVector), {
            limit: 3,
            distanceMeasure: 'COSINE'
          });

        const snap = await bankQuery.get();
        const contexts: any[] = [];
        snap.forEach(doc => {
          contexts.push(doc.data().questionData);
        });

        if (contexts.length > 0) {
          candidateContext = `\nREFERENSI BANK SOAL MASA LALU (Gunakan sebagai inspirasi format/opsi jika relevan):\n${JSON.stringify(contexts)}`;
        }
      } catch (vectorErr) {
        console.warn("RAG Vector search dilewati (Non-Fatal):", vectorErr);
      }

      // 2. Eksekusi Low-Temperature AI
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        systemInstruction: "Anda adalah AI Field Co-Pilot yang sangat akurat, logis, dan presisi. Tugas Anda adalah mengambil satu 'Pertanyaan Mentah' dan menyempurnakannya menjadi struktur JSON interaktif tingkat lanjut.",
        generationConfig: {
          temperature: 0.1, // Sangat rendah agar deterministik dan tidak berhalusinasi
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
                aiReasoning: { type: SchemaType.STRING, description: "Penjelasan mengapa AI menyempurnakan struktur ini" },
                type: { type: SchemaType.STRING },
                required: { type: SchemaType.BOOLEAN },
                gridSpan: { type: SchemaType.INTEGER },
                fileAccept: { type: SchemaType.STRING },
                options: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, weight: { type: SchemaType.INTEGER } } } },
                showIf: { type: SchemaType.OBJECT, properties: { fieldId: { type: SchemaType.STRING }, equals: { type: SchemaType.STRING } } }
              }
            }
          }
        }
      });

      const prompt = `
        Konteks Program: ${trackName || 'Umum'}
        
        DATA PERTANYAAN MENTAH SAAT INI:
        ${JSON.stringify(currentField, null, 2)}
        ${candidateContext}

        ATURAN PENYEMPURNAAN (MUTLAK):
        1. Pertajam bahasa pada properti "label" menjadi kalimat tanya yang profesional.
        2. CERDASKAN TIPE INPUT: Jika input mentahnya adalah 'text' atau 'textarea' namun konteksnya lebih cocok menjadi pilihan ganda, ubah tipenya menjadi 'radio' atau 'select', lalu ciptakan array "options" yang logis beserta bobotnya ("weight" antara 0 hingga 100).
        3. CIPTAKAN PERTANYAAN BERANTAI (Jika Perlu): Jika pertanyaan awal berpotensi membutuhkan BUKTI FISIK (misal: menanyakan Izin, Sertifikasi, Laporan) ATAU ALASAN KHUSUS (jika memilih hal negatif), Anda WAJIB menciptakan 1 Field Tambahan di dalam array!
           - Field tambahan ini bertipe 'file' (jika butuh dokumen) atau 'textarea' (jika butuh penjelasan).
           - Field tambahan ini WAJIB menggunakan properti "showIf" yang "fieldId"-nya merujuk pada "id" field pertama, dan "equals" merujuk pada label opsi pemicunya.
        4. Output WAJIB berupa Array berisi 1 objek (jika hanya disempurnakan) atau 2 objek (jika ditambahkan pertanyaan berantai/showIf).
        5. Pastikan properti "gridSpan" diset ke 2.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }
      
      const enhancedFields = JSON.parse(rawText);

      return { success: true, fields: enhancedFields };

    } catch (error: any) {
      console.error("Gagal menyempurnakan field:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI Field Co-Pilot.");
    }
});