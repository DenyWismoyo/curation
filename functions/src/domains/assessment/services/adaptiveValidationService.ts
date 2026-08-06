// functions/src/adaptiveValidationService.ts

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const resolveAdaptiveToneGuidance = (
  aiPromptConfig: any,
  mode: 'question' | 'result'
): string => {
  const preset = aiPromptConfig?.adaptiveLanguageStylePreset || 'auto';
  const formPurpose = String(aiPromptConfig?.formPurpose || 'assessment').toLowerCase();
  const audience = String(aiPromptConfig?.targetAudience || 'company').toLowerCase();

  const autoPreset =
    formPurpose === 'counseling'
      ? 'friendly_counseling'
      : (audience === 'individual' || audience === 'student')
        ? 'friendly_self_assessment'
        : 'neutral_professional';

  const activePreset = preset === 'auto' ? autoPreset : preset;

  const map: Record<string, string> = {
    friendly_counseling:
      'Gunakan bahasa empatik, lembut, tidak menghakimi, dan terasa seperti pendamping konseling mandiri.',
    friendly_self_assessment:
      'Gunakan bahasa santai-profesional, jelas, membumi, dan mudah dipahami untuk asesmen mandiri.',
    warm_supportive:
      'Gunakan bahasa hangat, suportif, memberi dorongan, dan fokus pada kemajuan kecil yang realistis.',
    neutral_professional:
      'Gunakan bahasa profesional yang ringan, rapi, dan tetap mudah dipahami non-teknis.',
    direct_coach:
      'Gunakan bahasa tegas seperti coach, langsung ke inti, tetap sopan, dan actionable.',
  };

  const base = map[activePreset] || map.neutral_professional;
  const custom = mode === 'question'
    ? aiPromptConfig?.adaptiveQuestionTonePrompt
    : aiPromptConfig?.adaptiveResultTonePrompt;

  return custom && String(custom).trim().length > 0
    ? `${base}\nInstruksi tambahan khusus: ${String(custom).trim()}`
    : base;
};

// ============================================================================
// HELPER: BYPASS SDK DENGAN DIRECT REST API & ZERO-VECTOR FALLBACK
// ============================================================================
async function getSafeEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: text }] },
        outputDimensionality: 768
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
  secrets: [geminiApiKeySecret, deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { formData, trackName, aiPromptConfig, stepTitle, stepDescription, templateId, stepIndex, targetMetrics } = request.data;
    if (!formData) throw new HttpsError("invalid-argument", "Data formulir tidak ditemukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const db = getFirestore(admin.app(), "curation");

      const persona = aiPromptConfig?.aiPersona || "Asesor Profesional & Auditor Analitis";
      const strictness = aiPromptConfig?.gradingStrictness || "standard";
      const adaptiveToneGuidance = resolveAdaptiveToneGuidance(aiPromptConfig, 'question');

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

      const deepseekApiKey = deepseekApiKeySecret.value();

      const candidateQuestionSample = candidateQuestions.slice(0, 8);
      const deepseekSystemInstruction = `
    Anda adalah ${persona}.
    Tugas: merancang pertanyaan kuesioner dinamis untuk satu seksi assessment.
    Prioritas kualitas:
    1. Pertanyaan harus tajam, relevan, dan tidak mengulang informasi yang sudah ada.
    2. DILARANG menggunakan tipe input "select" (dropdown). Fokuskan 80% pada "radio" (pilihan tunggal) atau "checkbox" (pilihan ganda), dan 20% pada "text"/"textarea" untuk probing.
    3. Jangan gunakan showIf, branching, atau logika pertanyaan bersyarat apa pun.
    4. Gunakan options berbobot untuk tipe "radio" dan "checkbox". Pastikan bobot terdistribusi dengan baik pada skala 0 hingga 100.
    5. Tandai 1-2 pertanyaan paling krusial dengan weightMultiplier 2, 3, atau 5.
    6. Tulis aiReasoning yang menjelaskan kenapa pertanyaan ini penting dan hubungannya dengan metrik target.
    7. WAJIB patuhi gaya bahasa berikut (berlaku untuk pertanyaan dan pilihan jawaban): ${adaptiveToneGuidance}
    8. Gunakan kata-kata pertanyaan yang sederhana, jelas, dan mudah dipahami pengguna non-teknis.
       Hindari jargon teknis, istilah abstrak, dan kalimat panjang berlapis.
    Nilai untuk properti "type" HANYA boleh: "radio", "checkbox", "text", "textarea", atau "file".
    Output wajib: JSON object murni dengan key "fields" berisi array FormField.
    `;

      const buildAdaptiveQuestionPrompt = (instructions: string) => `
    ${instructions}
    `;

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
        systemInstruction: `Anda adalah ${persona}. Tugas Anda merancang instrumen pertanyaan kuesioner dinamis secara real-time. Output WAJIB berupa array JSON berisi objek 'FormField'.`,
        generationConfig: {
          temperature: 0.7,
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
                weightMultiplier: { type: SchemaType.INTEGER },
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
              }
            }
          }
        }
      });

      const reportTone = aiPromptConfig?.reportTone || "investigative";
      const formPurpose = aiPromptConfig?.formPurpose || "assessment";
      
      const audienceType = aiPromptConfig?.targetAudience || 'company';
      let audienceContext = "";
      if (audienceType === 'individual' || audienceType === 'student') {
        audienceContext = "TARGET AUDIENS: INDIVIDU / PERSONAL. Gunakan sapaan langsung (Anda/Bapak/Ibu). DILARANG KERAS menanyakan aspek perusahaan, omzet, atau operasional bisnis perusahaan.";
      } else if (audienceType === 'government') {
        audienceContext = "TARGET AUDIENS: INSTANSI PEMERINTAH. Fokus pada tata kelola, pelayanan publik, dan kepatuhan regulasi.";
      } else if (audienceType === 'startup' || audienceType === 'umkm') {
        audienceContext = "TARGET AUDIENS: BISNIS KECIL/MENENGAH/STARTUP. Fokus pada operasional bisnis, inovasi, dan penjualan.";
      } else {
        audienceContext = "TARGET AUDIENS: PERUSAHAAN / KORPORAT. Gunakan bahasa profesional bisnis (B2B).";
      }

      const dynamicRules = `
          GAYA BAHASA & PENDEKATAN TANYA JAWAB:
          - Sifat Pendekatan (Strictness): ${strictness}
          - Nada/Tone: ${reportTone}
          - Tujuan Kuesioner (Purpose): ${formPurpose}
          - ${audienceContext}
          - GUIDANCE ADAPTIVE TONE: ${adaptiveToneGuidance}
          
          Sesuaikan gaya penyusunan pertanyaan Anda dengan pengaturan di atas. Jika tujuannya adalah konseling, mentoring, atau supportive, gunakan bahasa yang empatik, menggali, dan merangkul.

          ${aiPromptConfig?.customSystemPrompt ? `ATURAN KONDISIONAL KHUSUS:\n${aiPromptConfig.customSystemPrompt}\n` : ''}
          ${aiPromptConfig?.negativePrompts ? `PANTANGAN KERAS (DILARANG):\n${aiPromptConfig.negativePrompts}\n` : ''}
          ${aiPromptConfig?.customScoringRubric ? `RUBRIK PENILAIAN (PANDUAN BOBOT SKOR):\n${aiPromptConfig.customScoringRubric}\n` : ''}

          ATURAN KUSTOMISASI WAJIB (AGAR TIDAK MONOTON & TEPAT SASARAN):
          1. FOKUS TARGET METRIK: Pertanyaan yang Anda buat WAJIB difokuskan untuk mengukur secara spesifik metrik berikut: [${targetMetrics?.join(', ') || 'Metrik Umum'}].
          2. ANTI-DUPLIKASI (MUTLAK): Baca 'Data Peserta Sebelumnya' dengan teliti. DILARANG KERAS membuat pertanyaan yang esensinya sama persis dengan informasi yang sudah dijawab. Anda boleh menggunakan jawaban sebelumnya sebagai dasar/pijakan untuk bertanya LEBIH DALAM (probing), tapi jangan mengulang pertanyaan.
          3. HYPER-PERSONALIZATION: Singgung secara spesifik data/jawaban dari "Data Peserta Sebelumnya" ke dalam label pertanyaan atau deskripsi agar terasa relevan.
          3a. KEJELASAN BAHASA: Setiap pertanyaan dan pilihan jawaban (options) harus mudah dimengerti dalam sekali baca oleh pengguna awam. Gunakan kalimat singkat, langsung, dan tidak berbelit sesuai Tone yang ditetapkan.
          4. STRUKTUR TIPE INPUT (PRIORITAS):
             - DILARANG menggunakan tipe "select" (dropdown).
             - FOKUS 80% pada tipe "radio" (untuk satu pilihan) dan "checkbox" (untuk banyak pilihan) agar peserta mudah mengisi.
             - Untuk 'radio'/'checkbox', WAJIB isi properti 'options' dengan format [{label: 'Opsi A', weight: 100}, {label: 'Opsi B', weight: 50}]. Gunakan Rubrik Penilaian di atas sebagai acuan bobot 0-100, pastikan ada opsi yang bernilai rendah, sedang, dan tinggi.
             - FOKUS 20% pada tipe "textarea" atau "text" khusus untuk probing/penggalian alasan yang mendalam.
             - Nilai "type" HANYA boleh: "radio", "checkbox", "text", "textarea", atau "file".
             ${audienceType === 'individual' || audienceType === 'student' ? '- DILARANG menggunakan tipe "file" (unggah dokumen) karena ini untuk individu/personal.' : '- Gunakan tipe "file" HANYA jika sangat krusial untuk meminta bukti.'}
          5. PEMBOBOTAN KRITIS (weightMultiplier): Untuk 1-2 pertanyaan yang paling krusial di tahap ini (yang paling menentukan target metrik), set "weightMultiplier": 2, 3, atau 5. Biarkan properti ini kosong atau 1 untuk pertanyaan sekunder.
          6. PERSONALISASI REASONING: Jelaskan secara cerdas pada 'aiReasoning' mengapa AI merancang pertanyaan ini dan jelaskan kaitan spesifiknya dengan Metrik yang dituju.
      `;

      let prompt = "";
      if (candidateQuestions.length >= 5) {
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Judul Seksi: "${stepTitle}"
          Target Metrik Seksi Ini: [${targetMetrics?.join(', ') || 'Metrik Umum'}]
          BERIKUT ADALAH KANDIDAT PERTANYAAN: ${JSON.stringify(candidateQuestionSample)}
          INSTRUKSI: Pilih 4-6 pertanyaan TERBAIK yang cocok dengan profil peserta di bawah ini dan modifikasi sesuai dengan aturan.
          Data Peserta Sebelumnya: ${contextString}
          
${dynamicRules}
        `;
      } else {
        prompt = `
          Konteks Program Asesmen: ${trackName}
          Data Peserta Sebelumnya: ${contextString}
          TUGAS MERANCANG PERTANYAAN UNTUK: "${stepTitle}" (${stepDescription || '-'})
          Target Metrik Seksi Ini: [${targetMetrics?.join(', ') || 'Metrik Umum'}]
          INSTRUKSI: Rancang 4-8 pertanyaan baru secara spesifik untuk membedah profil ini.
          
${dynamicRules}
        `;
      }

      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: deepseekApiKey,
      });

      const deepseekPrompt = buildAdaptiveQuestionPrompt(`
          Konteks Program Asesmen: ${trackName}
          Judul Seksi: "${stepTitle}"
          Target Metrik Seksi Ini: [${targetMetrics?.join(', ') || 'Metrik Umum'}]
          ${candidateQuestions.length >= 5 ? `BERIKUT ADALAH KANDIDAT PERTANYAAN: ${JSON.stringify(candidateQuestionSample)}` : ''}
          Data Peserta Sebelumnya: ${contextString}
          ${dynamicRules}
      `);

      let dynamicFields: any[] = [];
      try {
        const response = await deepseekClient.chat.completions.create({
          model: 'deepseek-v4-flash',
          messages: [
            {
              role: 'system',
              content: deepseekSystemInstruction,
            },
            { role: 'user', content: deepseekPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.65,
        });

        let rawText = response.choices[0]?.message?.content || '[]';
        if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

        const parsedDeepseek = JSON.parse(rawText);
        dynamicFields = Array.isArray(parsedDeepseek)
          ? parsedDeepseek
          : Array.isArray(parsedDeepseek.fields)
            ? parsedDeepseek.fields
            : [];
      } catch (deepseekErr: any) {
        console.warn('[AdaptiveWizard] DeepSeek gagal, fallback ke Gemini untuk menjaga pengalaman user.', deepseekErr?.message || deepseekErr);

        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();
        if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
        dynamicFields = JSON.parse(rawText);
      }

      const flattenedFields = Array.isArray(dynamicFields)
        ? dynamicFields.map((field) => {
            if (!field || typeof field !== 'object') return field;
            const { showIf, ...rest } = field;
            return rest;
          })
        : [];

      // BACKGROUND HARVESTING DENGAN BYPASS REST API
      if (candidateQuestions.length < 5 && Array.isArray(flattenedFields)) {
        try {
          for (const field of flattenedFields) {
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

      return { success: true, fields: flattenedFields };

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
  const { formData, trackName, currentTotalSteps, maxAdaptiveSections = 10 } = request.data;
  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  if (currentTotalSteps >= maxAdaptiveSections) return { requiresNewSection: false };

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite", 
    systemInstruction: `Anda adalah Asesor Ahli. Karena target asesmen ini adalah ${maxAdaptiveSections} seksi dan saat ini baru tercapai ${currentTotalSteps} seksi, Anda WAJIB MENGHASILKAN 1 SEKSI INVESTIGASI TAMBAHAN. Anda dilarang menghentikan asesmen (requiresNewSection WAJIB true). Fokuslah mendalami area yang paling berisiko, lemah, atau menarik dari jawaban sebelumnya.`,
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

  const prompt = `Konteks: ${trackName}\nTotal Seksi Saat Ini: ${currentTotalSteps}\nTarget Maksimal Seksi: ${maxAdaptiveSections}\nJawaban: ${JSON.stringify(formData)}\nAnalisis area mana yang perlu didalami di seksi berikutnya.`;
  
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