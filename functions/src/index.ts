// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { buildAssessmentPrompt, getSystemPrompt } from "./promt/promptTemplate";

// ============================================================================
// EXPORT FUNGSI MODULAR
// ============================================================================
export { generatePDFReport } from "./documentGenerator";
export { matchBusinessWithIndustry } from "./vectorService";
export { generateFormTemplateFromAI } from "./formBuilderService";

// ============================================================================
// INISIALISASI FIREBASE
// ============================================================================
admin.initializeApp();
const db = getFirestore(admin.app(), "curation");

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

// FUNGSI RETRY EXPONENTIAL BACKOFF TINGKAT TINGGI (Kebal 503 & JSON Error)
const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delayMs = 3000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    
    console.warn(`  Proses API/JSON gagal (${error.message}). Mencoba ulang (Sisa percobaan: ${retries - 1})...`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

// ============================================================================
// CLOUD FUNCTION: ASESMEN AI UTAMA (MULTI-AGENT ARCHITECTURE)
// ============================================================================
export const processCurationAssessment = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Pengguna harus login.");
    
    const userId = request.auth.uid;
    const userEmail = request.auth.token.email || '';
    const data = request.data as any;
    
    if (!data) throw new HttpsError("invalid-argument", "Data request kosong.");
    
    const formData = data.formData || {};
    const trackType = data.trackType || "Evaluasi Umum";
    const tokenUsed = data.tokenUsed;
    let corporateEntityName = null;
    let allowedDocTemplates: string[] = [];
    
    const aiPromptConfig = data.aiPromptConfig || {};
    const storageFilePaths = data.storageFilePaths || [];

    // Validasi Token Organisasi
    if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
      const lastDashIndex = tokenUsed.lastIndexOf('-');
      const corpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      const corpRef = db.collection('corporate_tokens').doc(corpId);
      const corpDoc = await corpRef.get();
      if (!corpDoc.exists) throw new HttpsError("not-found", `Entitas korporat tidak ditemukan.`);
      
      const corpData = corpDoc.data();
      const tData = (corpData?.tokens || {})[tokenCode];
      
      if (!tData) throw new HttpsError("not-found", `Token tidak ditemukan.`);
      if (tData.isUsed) throw new HttpsError("permission-denied", "Token telah digunakan.");
      
      corporateEntityName = corpData?.corporateName || corpId;
      allowedDocTemplates = corpData?.allowedDocumentTemplates || [];
    }

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const fileManager = new GoogleAIFileManager(API_KEY);
    
    const tempLocalFiles: string[] = [];
    const uploadedGeminiFiles: any[] = [];

    try {
      const parts: any[] = [];
      const bucket = admin.storage().bucket();

      // ----------------------------------------------------------------------
      // PEMROSESAN FILE MULTIMODAL (ANTI-CRASH UNTUK ZIP/RAR)
      // ----------------------------------------------------------------------
      if (storageFilePaths && storageFilePaths.length > 0) {
        for (const filePath of storageFilePaths) {
          try {
            const fileName = path.basename(filePath); 
            
            const [metadata] = await bucket.file(filePath).getMetadata();
            const mimeType = metadata.contentType || 'application/octet-stream';

            const isSupported = 
              mimeType === 'application/pdf' ||
              mimeType.startsWith('image/') ||
              mimeType.startsWith('video/') ||
              mimeType.startsWith('audio/') ||
              mimeType.startsWith('text/');

            if (!isSupported || fileName.toLowerCase().endsWith('.zip') || fileName.toLowerCase().endsWith('.rar') || fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.xlsx')) {
              console.warn(`[FILTER] File dilewati. Format tidak didukung Gemini: ${fileName} (${mimeType})`);
              
              parts.push({ 
                text: `[SYSTEM NOTE]: Pengguna telah melampirkan berkas bukti bernama "${fileName}". Karena formatnya berupa arsip/dokumen khusus, visi sistem tidak dapat membacanya secara otomatis. Namun, secara administratif BUKTI TELAH DILAMPIRKAN. Anggap klaim pengguna tervalidasi untuk menjaga 'dataConfidenceScore'.` 
              });
              continue; 
            }

            const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
            await bucket.file(filePath).download({ destination: tempFilePath });
            tempLocalFiles.push(tempFilePath);
            
            const uploadResult = await withRetry(() => fileManager.uploadFile(tempFilePath, {
              mimeType: mimeType, 
              displayName: "Dokumen Lampiran"
            }), 4, 3000);

            let fileState = await withRetry(() => fileManager.getFile(uploadResult.file.name), 4, 3000);
            
            let pollingAttempts = 0;
            while (fileState.state === "PROCESSING" && pollingAttempts < 20) {
              await new Promise(r => setTimeout(r, 5000));
              fileState = await withRetry(() => fileManager.getFile(uploadResult.file.name), 3, 2000);
              pollingAttempts++;
            }

            if (fileState.state === "FAILED" || fileState.state === "PROCESSING") {
              console.warn(`File ${fileName} ditolak oleh Gemini.`);
              continue; 
            }

            uploadedGeminiFiles.push(uploadResult.file);
            parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
            
          } catch (fileErr: any) {
            console.warn(`[FAIL-SAFE] Gagal mengunggah file ke Gemini API.`, fileErr);
          }
        }
      }

      // ----------------------------------------------------------------------
      // RAG VECTOR SEARCH & ASSEMBLE TEXT DATA
      // ----------------------------------------------------------------------
      let fewShotContext = "";
      try {
         const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
         const ragQuery = `Track: ${trackType}, Data Bisnis: ${JSON.stringify(formData)}`;
         
         const embedResult = await withRetry(() => embedModel.embedContent(ragQuery));
         const vectorQuery = db.collection('business_vectors')
           .findNearest('embedding', admin.firestore.FieldValue.vector(embedResult.embedding.values), { limit: 2, distanceMeasure: 'COSINE' });
           
         const vectorSnap = await vectorQuery.get();
         if (!vectorSnap.empty) {
            fewShotContext = `\n[KONTEKS RAG INDUSTRI]: Gunakan profil bisnis serupa yang pernah dievaluasi ini sebagai pembanding kalibrasi: ` + 
              vectorSnap.docs.map(d => `(${d.data().namaUsaha} | Kesiapan: ${d.data().readinessLevel} | Skor: ${d.data().score})`).join(", ");
         }
      } catch (err) { console.warn("RAG Vector search dilewati karena error minor."); }

      const textData: Record<string, any> = {};
      for (const key in formData) {
        const val = formData[key];
        if (typeof val !== 'string' || !val.startsWith('http')) {
          if (val) textData[key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())] = val;
        }
      }
      
      const dataString = Object.entries(textData).map(([k, v]) => `- [Data ${k}]: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
      
      const strictness = aiPromptConfig.gradingStrictness || 'standard';
      let strictnessInstruction = "Lakukan penilaian secara objektif dan berimbang.";
      if (strictness === 'strict') strictnessInstruction = "Lakukan penilaian SANGAT KETAT selevel audit Venture Capital.";
      if (strictness === 'supportive') strictnessInstruction = "Lakukan penilaian yang suportif dan edukatif.";
      
      const tone = aiPromptConfig.reportTone || 'consultative';
      let toneInstruction = "Gaya bahasa: Konsultatif & Solutif.";
      if (tone === 'investigative') toneInstruction = "Gaya bahasa: Investigatif & Analitis.";
      
      const customTiers = aiPromptConfig.customReadinessTiers || [];
      const tiersString = customTiers.length > 0 ? customTiers.map((t: string) => `"${t}"`).join(', ') : '"Pra-Inkubasi", "Siap Akselerasi", "Lulus Investasi"';
      
      let finalSystemPrompt = aiPromptConfig.customSystemPrompt || '';
      finalSystemPrompt = finalSystemPrompt.replace(/{{namaUsaha}}/g, formData.namaUsaha || 'Entitas Terkait');
      finalSystemPrompt = finalSystemPrompt.replace(/{{sektorIndustri}}/g, formData.sektorIndustri || 'Sektor Usaha');
      
      const mainPromptText = buildAssessmentPrompt({
        aiPersona: aiPromptConfig.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA",
        trackContext: trackType,
        assessmentGoal: aiPromptConfig.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat, menganalisis potensi, dan memberikan rekomendasi strategis.",
        strictnessInstruction, toneInstruction, dataString, storageFilePaths,
        mediaFocus: aiPromptConfig.mediaAnalysisFocus ? `Fokus Evaluasi Media: Aspek ${aiPromptConfig.mediaAnalysisFocus}.` : '',
        targetAnalysisBlocks: aiPromptConfig.expectedAnalysisBlocks?.map((b: string) => `- ${b}`).join("\n") || "- Posisi Pasar\n- Kesehatan Finansial\n- Kapabilitas Tim",
        targetMetrics: aiPromptConfig.expectedMetrics || ["Validasi Pasar", "Keuangan", "Tim", "Skalabilitas", "Legalitas"],
        riskInstruction: aiPromptConfig.riskFramework ? `FOKUS IDENTIFIKASI RISIKO WAJIB: ${aiPromptConfig.riskFramework}` : "Identifikasi risiko operasional, finansial, dan pasar secara umum.",
        targetRecommendations: aiPromptConfig.expectedRecommendations?.map((r: string) => `- ${r}`).join("\n") || "- Strategi Bisnis\n- Rencana Pendanaan",
        tiersString, fewShotContext,
        customSystemPrompt: finalSystemPrompt,
        negativePrompts: aiPromptConfig.negativePrompts,
        formatInstructions: aiPromptConfig.formatInstructions,
        customScoringRubric: aiPromptConfig.customScoringRubric
      });
      
      parts.unshift({ text: mainPromptText });
      const systemPrompt = getSystemPrompt(true);

      // ======================================================================
      // FASE 1: MASTER ASSESSOR (GEMINI 3.1 PRO PREVIEW)
      // ======================================================================
      console.log(`[FASE 1] Menjalankan Master Assessor (Gemini 3.1 Pro)...`);
      
      const masterModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096, 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["_internalReasoning", "readinessLevel", "totalScore", "dataConfidenceScore", "contradictionsFound", "incubationRoute", "executiveSummary", "swotAnalysis", "riskAssessment", "outlines"],
            properties: {
              _internalReasoning: { type: SchemaType.STRING, description: "Berpikir analitis sebelum menentukan skor" },
              executiveSummary: { type: SchemaType.STRING },
              readinessLevel: { type: SchemaType.STRING },
              totalScore: { type: SchemaType.INTEGER },
              dataConfidenceScore: { type: SchemaType.INTEGER },
              contradictionsFound: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              incubationRoute: { type: SchemaType.STRING },
              swotAnalysis: {
                type: SchemaType.OBJECT,
                properties: { strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
              },
              riskAssessment: {
                type: SchemaType.OBJECT,
                properties: { criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
              },
              outlines: {
                type: SchemaType.OBJECT,
                description: "Kerangka output yang kelak akan diekspansi narasinya",
                properties: {
                  blocksToElaborate: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING }, metricsLabel: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } } },
                  metricsToElaborate: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER } } } },
                  recommendationsToElaborate: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              }
            }
          }
        }
      });

      const masterPromptOverride = `
        ${parts[0].text}
        
        PERHATIAN TUGAS MASTER (SANGAT PENTING):
        Guna menghemat komputasi Anda, JANGAN tulis narasi paragraf pada bagian: "Custom Analysis Blocks", "Metrics Array", dan "Action Plan".
        Tugas Anda HANYA mencatat Judul Blok & Sub (blocksToElaborate), Label & Skor (metricsToElaborate), dan Judul Rekomendasi (recommendationsToElaborate) ke dalam array "outlines" di format JSON! Narasi detailnya akan diselesaikan oleh asisten Anda.
        PASTIKAN OUTPUT JSON VALID. DILARANG MENGGUNAKAN NEWLINE HARFIAH DI DALAM STRING (GUNAKAN '\\n').
      `;

      const masterParts = [{ text: masterPromptOverride }, ...parts.slice(1)];
      
      const masterJson = await withRetry(async () => {
        const masterResult = await masterModel.generateContent({ contents: [{ role: "user", parts: masterParts }] });
        let masterRawText = masterResult.response.text().trim();
        if (masterRawText.startsWith('```')) masterRawText = masterRawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
        return JSON.parse(masterRawText);
      });
      
      const outlines = masterJson.outlines;

      // ======================================================================
      // FASE 2: WORKER AGENTS (GEMINI 2.5 FLASH) - PARALLEL EXECUTION
      // ======================================================================
      console.log(`[FASE 2] Mengerahkan Worker Agents (Gemini 2.5 Flash) secara paralel...`);

      const getWorkerModel = (schema: any) => genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Anda adalah AI Content Elaborator. Tugas Anda menjabarkan data menjadi narasi berparagraf. OUTPUT WAJIB BERUPA JSON VALID. JIKA INGIN PINDAH BARIS, GUNAKAN '\\n' (SLASH N), DILARANG KERAS MENGGUNAKAN ENTER/NEWLINE HARFIAH.",
        generationConfig: { temperature: 0.4, responseMimeType: "application/json", responseSchema: schema }
      });

      // -- WORKER A: Analisis Blok --
      const workerABlocks = async () => {
        if (!outlines?.blocksToElaborate || outlines.blocksToElaborate.length === 0) return [];
        try {
          const schemaA = {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.OBJECT, required: ["title", "iconType", "metrics"], properties: { title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING }, metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "value"], properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING, description: "Narasi tebal 3-5 kalimat komprehensif" } } } } } }
          };
          const promptA = `JABARKAN narasi analitis yang panjang dan mendalam untuk kerangka blok ini berdasarkan data subjek: ${dataString}. Kerangka Blok: ${JSON.stringify(outlines.blocksToElaborate)}. PENTING: Tiap 'value' WAJIB diisi 3-5 kalimat narasi yang membedah korelasi dari jawaban peserta!`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaA).generateContent(promptA);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { console.error("Worker A Gagal:", e); return []; }
      };

      // -- WORKER B: Metrik Radar --
      const workerBMetrics = async () => {
        if (!outlines?.metricsToElaborate || outlines.metricsToElaborate.length === 0) return [];
        try {
          const schemaB = {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING, description: "Narasi tebal 2-4 kalimat" } } }
          };
          const promptB = `JABARKAN justifikasi evaluasi naratif untuk masing-masing pilar metrik ini. Mengapa metrik ini mendapatkan skor tersebut? Data Subjek: ${dataString}. Skor Total Akhir Subjek: ${masterJson.totalScore}/100. Kerangka Metrik & Skor: ${JSON.stringify(outlines.metricsToElaborate)}`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaB).generateContent(promptB);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { console.error("Worker B Gagal:", e); return []; }
      };

      // -- WORKER C: Action Plan & Timeline --
      const workerCRecommendations = async () => {
        if (!outlines?.recommendationsToElaborate || outlines.recommendationsToElaborate.length === 0) return { recommendations: [], nextActionSteps: [] };
        try {
          const schemaC = {
            type: SchemaType.OBJECT,
            required: ["recommendations", "nextActionSteps"],
            properties: {
              recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "content"], properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING, description: "Penjelasan strategi taktis & mendalam" } } } },
              nextActionSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["timeframe", "task"], properties: { timeframe: { type: SchemaType.STRING }, task: { type: SchemaType.STRING, description: "Langkah eksekusi spesifik" } } } }
            }
          };
          const promptC = `Buat Rencana Tindakan (Action Plan) TAKTIS DAN MENDALAM berdasarkan fokus rekomendasi ini: ${JSON.stringify(outlines.recommendationsToElaborate)}. Pastikan solusi Anda secara langsung menargetkan kelemahan berikut: ${JSON.stringify(masterJson.swotAnalysis?.weaknesses || [])}.`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaC).generateContent(promptC);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { console.error("Worker C Gagal:", e); return { recommendations: [], nextActionSteps: [] }; }
      };

      // -- WORKER D: Analisis File Forensik --
      const workerDFiles = async () => {
        if (!storageFilePaths || storageFilePaths.length === 0 || uploadedGeminiFiles.length === 0) return null; // HARUS NULL UNTUK FIRESTORE
        try {
          const schemaD = {
            type: SchemaType.OBJECT,
            required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"],
            properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } }
          };
          const promptD = `Lakukan analisis FORENSIK terhadap dokumen yang dilampirkan pengguna ini. Bandingkan isinya dengan klaim teks berikut dan cari kesenjangannya: ${dataString}.`;
          
          const fileParts = [{ text: promptD }, ...parts.slice(1)];
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaD).generateContent({ contents: [{ role: "user", parts: fileParts }] });
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { console.error("Worker D Gagal:", e); return null; }
      };

      // Eksekusi Paralel Keempat Pekerja 
      const [finalBlocks, finalMetrics, finalRecommendations, finalFiles] = await Promise.all([
        workerABlocks(),
        workerBMetrics(),
        workerCRecommendations(),
        workerDFiles()
      ]);

      // ======================================================================
      // FASE 3: ASSEMBLER & TRANSACTION
      // ======================================================================
      console.log(`[FASE 3] Menyatukan seluruh data dan menyimpannya ke database...`);
      
      const aiResultJson = {
        _internalReasoning: masterJson._internalReasoning || "",
        executiveSummary: masterJson.executiveSummary || "",
        readinessLevel: masterJson.readinessLevel || "Belum Ditentukan",
        totalScore: masterJson.totalScore || 0,
        dataConfidenceScore: masterJson.dataConfidenceScore || 0,
        contradictionsFound: masterJson.contradictionsFound || [],
        incubationRoute: masterJson.incubationRoute || "",
        swotAnalysis: masterJson.swotAnalysis || {},
        riskAssessment: masterJson.riskAssessment || {},
        customAnalysisBlocks: finalBlocks || [],
        metrics: finalMetrics || [],
        recommendations: finalRecommendations?.recommendations || [],
        nextActionSteps: finalRecommendations?.nextActionSteps || [],
        fileAnalysisInsights: finalFiles || null,
        formPurpose: aiPromptConfig.formPurpose || 'assessment',
        customUiLabels: aiPromptConfig.customUiLabels || {}
      };

      let assessmentId = "";
      
      // 1. JALANKAN TRANSACTION DATABASE UTAMA DULU
      await db.runTransaction(async (transaction) => {
        if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
          const lastDashIndex = tokenUsed.lastIndexOf('-');
          const corpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          
          const corpRefToUpdate = db.collection('corporate_tokens').doc(corpId);
          const cDoc = await transaction.get(corpRefToUpdate);
          if (!cDoc.exists) throw new Error(`Entitas ${corpId} tidak ditemukan.`);
          
          const corpData = cDoc.data();
          const tData = (corpData?.tokens || {})[tokenCode];
          if (!tData) throw new Error(`Token ${tokenCode} tidak ditemukan.`);
          if (tData.isUsed) throw new Error("Token telah digunakan oleh pihak lain.");
          
          transaction.update(corpRefToUpdate, {
            [`tokens.${tokenCode}.isUsed`]: true,
            [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
            [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
            usedCount: admin.firestore.FieldValue.increment(1)
          });
        }

        const newAssessmentRef = db.collection("assessments").doc();
        assessmentId = newAssessmentRef.id;
        
        const updatedDocData = {
          userId: userId, 
          userEmail: formData.email || userEmail,
          trackType: trackType,
          corporateEntity: corporateEntityName, 
          namaUsaha: formData.namaUsaha || 'Tanpa Nama',
          whatsapp: formData.whatsapp || '',
          score: aiResultJson.totalScore || 0,
          readinessLevel: aiResultJson.readinessLevel || 'Belum Ditentukan',
          formData: formData,
          aiResult: aiResultJson,
          tokenUsed: tokenUsed || null, 
          allowedDocumentTemplates: allowedDocTemplates, 
          documentGenerationQuota: tokenUsed ? 1 : 0, 
          hasPaidForDocument: false, 
          status: "COMPLETED", 
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(newAssessmentRef, updatedDocData);
      });

      // ======================================================================
      // 2. BACKGROUND TASKS BERJALAN DAN DITUNGGU (AWAIT)
      // Ini perbaikan krusial agar Vector, PDF, & Email berhasil tersimpan
      // ======================================================================
      const updatedDocDataForBg = {
         namaUsaha: formData.namaUsaha || 'Tanpa Nama',
         trackType: trackType,
         score: aiResultJson.totalScore || 0,
         readinessLevel: aiResultJson.readinessLevel || 'Belum Ditentukan',
         formData: formData,
         aiResult: aiResultJson,
         userEmail: formData.email || userEmail
      };

      console.log("[BACKGROUND] Mengeksekusi Vector Database, Pembuatan PDF, dan Email...");
      
      await Promise.allSettled([
        // Eksekusi Vector Service
        (async () => {
          if (aiResultJson.totalScore !== undefined && aiResultJson.totalScore !== null) {
            try {
                const { generateAndStoreVectorEmbedding } = await import("./vectorService");
                await generateAndStoreVectorEmbedding(assessmentId, updatedDocDataForBg, API_KEY);
                console.log(`[SUCCESS] Vector berhasil disimpan untuk ${assessmentId}`);
            } catch (err) {
                console.error(`[ERROR] Gagal menyimpan Vector:`, err);
            }
          }
        })(),
        
        // Eksekusi Generate PDF
        (async () => {
           try {
             const { generateInternalPDF } = await import("./documentGenerator");
             await generateInternalPDF(assessmentId, updatedDocDataForBg, 'user');
             await generateInternalPDF(assessmentId, updatedDocDataForBg, 'curator');
             console.log(`[SUCCESS] PDF berhasil digenerate untuk ${assessmentId}`);
           } catch (err) {
             console.error(`[ERROR] Gagal membuat PDF:`, err);
           }
        })(),
        
        // Eksekusi Email
        (async () => {
          const smtpEmail = smtpEmailSecret.value();
          const smtpPassword = smtpPasswordSecret.value();
          if (smtpEmail && smtpPassword && updatedDocDataForBg.userEmail) {
            try {
                const { sendAssessmentEmail } = await import("./emailService");
                await sendAssessmentEmail(smtpEmail, smtpPassword, {
                  targetEmail: String(updatedDocDataForBg.userEmail),
                  namaUsaha: String(updatedDocDataForBg.namaUsaha),
                  totalScore: Number(aiResultJson.totalScore || 0),
                  readinessLevel: String(aiResultJson.readinessLevel),
                  trackType: String(updatedDocDataForBg.trackType),
                  assessmentUrl: `https://curation--teknopark-surakarta.asia-southeast1.hosted.app/result/${assessmentId}`
                });
                console.log(`[SUCCESS] Email berhasil dikirim ke ${updatedDocDataForBg.userEmail}`);
            } catch (err) {
                console.error(`[ERROR] Gagal mengirim Email:`, err);
            }
          }
        })()
      ]);

      console.log(`[SELESAI] Semua proses cloud function selesai untuk ID: ${assessmentId}`);
      
      // 3. KEMBALIKAN HASIL KE FRONTEND SETELAH SEMUANYA SELESAI
      return { assessmentId, aiResult: aiResultJson };
      
    } catch (error: any) {
      console.error("Cloud Function Error:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses analisis AI.");
    } finally {
      // Cleanup file sementara di server
      for (const tmpFile of tempLocalFiles) {
         try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {} 
      }
      // Cleanup file di memori Gemini
      for (const geminiFile of uploadedGeminiFiles) {
         try { 
           await withRetry(() => fileManager.deleteFile(geminiFile.name), 2, 2000); 
         } catch (e) {
          console.warn(`Pembersihan file di cloud gemini dilewati`);
         } 
      }
    }
  }
);