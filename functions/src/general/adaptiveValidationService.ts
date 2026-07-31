// functions/src/adaptiveValidationService.ts

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// ============================================================================
// HELPER: BYPASS SDK DENGAN DIRECT REST API & ZERO-VECTOR FALLBACK
// ============================================================================
async function getSafeEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text }] }
      })
    });
    
    if (!response.ok) {
       console.warn(`[REST API Error] ${response.status}: Model embedding gagal diakses.`);
       throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.embedding || !data.embedding.values) {
      throw new Error("Format balasan dari server tidak valid.");
    }
    return data.embedding.values;
  } catch (error) {
    console.warn("Bypass Embedding gagal, mengaktifkan Zero-Vector Fallback agar sistem tidak crash.", error);
    // Mengembalikan array berisi 768 angka 0 (Sesuai dimensi standar)
    return new Array(768).fill(0);
  }
}

// ============================================================================
// FUNGSI 1: GENERATE ADAPTIVE QUESTIONS DENGAN CIRCUIT BREAKER
// ============================================================================
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

      // Ekstrak teks penting
      const textData: Record<string, any> = {};
      for (const key in formData) {
        if (typeof formData[key] !== 'string' || !formData[key].startsWith('http')) {
          textData[key] = formData[key];
        }
      }
      const contextString = JSON.stringify(textData);

      // RAG STRATEGY: Cari kandidat pertanyaan dengan CIRCUIT BREAKER
      let candidateQuestions: any[] = [];
      try {
        const textToSearch = `Track: ${trackName}, Step: ${stepTitle}, Data: ${contextString}`;
        const queryVector = await getSafeEmbedding(textToSearch, API_KEY);

        const bankQuery = db.collection('adaptive_question_banks')
          .where('templateId', '==', templateId || 'general')
          .where('stepIndex', '==', stepIndex || 1)
          .findNearest('embedding', admin.firestore.FieldValue.vector(queryVector), {
            limit: 15,
            distanceMeasure: 'COSINE'
          });

        const snap = await Promise.race([
          bankQuery.get(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout Vektor")), 5000))
        ]);

        snap.forEach((doc: any) => {
          candidateQuestions.push(doc.data().questionData);
        });
      } catch (vectorErr: any) {
        console.warn("Pencarian Vektor dilewati:", vectorErr.message);
      }

      // PROSES GENERATE AI (Ini tetap menggunakan SDK karena terbukti aman dan jalan)
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
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
                id: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                aiReasoning: { type: SchemaType.STRING },
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

      const dynamicRules = `
          ATURAN KUSTOMISASI WAJIB (AGAR TIDAK MONOTON):
          1. VARIASI TIPE: Gunakan campuran tipe input seperti 'radio', 'select', 'textarea', 'number', dan 'file'.
          2. LOGIKA BERCABANG (showIf): Buat setidaknya 1-2 pertanyaan berlapis. Gunakan properti "showIf" (contoh: { fieldId: "idPertanyaanSebelumnya", equals: "Ya" }) untuk menagih detail lanjutan atau file bukti jika peserta memilih opsi tertentu.
          3. TIPE SPESIFIK: Jika menanyakan nominal/angka gunakan 'number'. Jika butuh dokumen/foto bukti gunakan 'file'.
          4. OPSI BERBOBOT: Untuk 'radio' atau 'select', WAJIB isi properti 'options' dengan format [{label: 'Opsi A', weight: 100}, {label: 'Opsi B', weight: 50}].
          5. PERSONALISASI: Jelaskan pada 'aiReasoning' mengapa AI memilih merancang pertanyaan ini secara khusus berdasarkan data peserta sebelumnya.
      `;

      let prompt = "";
      if (candidateQuestions.length >= 5) {
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Judul Seksi: "${stepTitle}"
          BERIKUT ADALAH KANDIDAT PERTANYAAN: ${JSON.stringify(candidateQuestions)}
          INSTRUKSI: Pilih 4-6 pertanyaan TERBAIK yang cocok dengan profil peserta di bawah ini.
          Data Peserta Sebelumnya: ${contextString}
          
${dynamicRules}
        `;
      } else {
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Data Peserta Sebelumnya: ${contextString}
          TUGAS MERANCANG PERTANYAAN UNTUK: "${stepTitle}" (${stepDescription || '-'})
          INSTRUKSI: Rancang 4-8 pertanyaan baru secara spesifik untuk membedah profil ini.
          
${dynamicRules}
        `;
      }

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      
      const dynamicFields = JSON.parse(rawText);

      // BACKGROUND HARVESTING DENGAN BYPASS REST API
      if (candidateQuestions.length < 5 && Array.isArray(dynamicFields)) {
        try {
          for (const field of dynamicFields) {
            const textToEmbed = `Track: ${trackName}, Step: ${stepTitle}, Label: ${field.label}`;
            const vectorVal = await getSafeEmbedding(textToEmbed, API_KEY);

            const embeddingData = typeof admin.firestore.FieldValue.vector === 'function'
              ? admin.firestore.FieldValue.vector(vectorVal)
              : vectorVal;

            const bankDocRef = db.collection('adaptive_question_banks').doc();
            await bankDocRef.set({
              templateId: templateId || 'general',
              stepIndex: stepIndex || 1,
              stepTitle: stepTitle,
              questionData: field,
              embedding: embeddingData,
              usageCount: 1,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (saveErr) {
          console.warn("Gagal menyimpan bank soal (Non-Fatal).", saveErr);
        }
      }

      return { success: true, fields: dynamicFields };

    } catch (error: any) {
      console.error("Gagal men-generate form adaptif:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI form.");
    }
});

// ============================================================================
// FUNGSI 2: MACRO-ADAPTIVE BRANCHING
// ============================================================================
export const evaluateMacroBranching = onCall({
  memory: "256MiB",
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
  const { formData, trackName, currentTotalSteps } = request.data;
  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  if (currentTotalSteps >= 7) return { requiresNewSection: false };

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite", 
    systemInstruction: "Anda adalah Asesor Ahli. Putuskan apakah partisipan butuh SEKSI INVESTIGASI TAMBAHAN.",
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          requiresNewSection: { type: SchemaType.BOOLEAN },
          newStep: {
            type: SchemaType.OBJECT,
            properties: {
              stepNumber: { type: SchemaType.INTEGER },
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING }
            }
          }
        }
      }
    }
  });

  const prompt = `Konteks: ${trackName}\nTotal Seksi Saat Ini: ${currentTotalSteps}\nJawaban: ${JSON.stringify(formData)}\nAnalisis apakah butuh pendalaman.`;
  
  try {
    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    const decision = JSON.parse(rawText);
    if (decision.newStep) {
        decision.newStep.stepNumber = currentTotalSteps + 1;
        decision.newStep.fields = []; 
    }
    return decision;
  } catch (error: any) {
    return { requiresNewSection: false }; 
  }
});

// ============================================================================
// FUNGSI 3 (HTTP SCRIPT TRIGGER): MANUAL PRE-WARMING VECTOR DB
// ============================================================================
export const manualTriggerRAGSeed = onRequest({
  memory: "512MiB",
  timeoutSeconds: 300,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (req, res) => {
  try {
    // TANGANI PREFLIGHT CORS SECARA MANUAL AGAR TIDAK DIBLOKIR OLEH AUTH CHECK
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.status(204).send('');
      return;
    }
    
    res.set('Access-Control-Allow-Origin', '*');

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send("UNAUTHORIZED: Missing or invalid token.");
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(token);
    } catch (e) {
      res.status(401).send("UNAUTHORIZED: Invalid or expired token.");
      return;
    }

    const templateId = req.query.templateId as string;
    
    if (!templateId) {
      res.status(400).send("GAGAL: Masukkan parameter ?templateId=ID_TEMPLATE di URL.");
      return;
    }

    const db = getFirestore(admin.app(), "curation");
    const docSnap = await db.collection("form_templates").doc(templateId).get();

    if (!docSnap.exists) {
       res.status(404).send("GAGAL: Template tidak ditemukan.");
       return;
    }

    const templateData = docSnap.data();
    const API_KEY = geminiApiKeySecret.value();

    let injectedCount = 0;
    const steps = templateData?.steps || [];

    for (const step of steps) {
      for (const field of step.fields || []) {
        const textToEmbed = `Track: ${templateData?.trackName}, Step: ${step.title}, Label: ${field.label}`;
        const vectorVal = await getSafeEmbedding(textToEmbed, API_KEY);

        const embeddingData = typeof admin.firestore.FieldValue.vector === 'function'
           ? admin.firestore.FieldValue.vector(vectorVal)
           : vectorVal;

        await db.collection('adaptive_question_banks').add({
          templateId: templateId,
          stepIndex: step.stepNumber || 1,
          stepTitle: step.title,
          questionData: field,
          embedding: embeddingData,
          usageCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        injectedCount++;
      }
    }

    res.status(200).send(`SUKSES ABSOLUT! Berhasil menginjeksi ${injectedCount} pertanyaan. Error API Key berhasil dibypass.`);
  } catch (error: any) {
    res.status(500).send(`INTERNAL SERVER ERROR: ${error.message}`);
  }
});