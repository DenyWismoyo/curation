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

import { buildAssessmentPrompt, getSystemPrompt } from "./promptTemplate"; 

export { generatePDFReport } from "./documentGenerator";
export { matchBusinessWithIndustry } from "./vectorService";

admin.initializeApp();
const db = getFirestore(admin.app(), "curation");

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (retries <= 1) throw error;
    console.warn(`⏳ API Gemini sibuk (${error.message}). Mencoba ulang dalam ${delayMs}ms...`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

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
    const aiModelType = data.aiModelType || 'pro';
    const storageFilePaths = data.storageFilePaths || [];

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

      if (storageFilePaths && storageFilePaths.length > 0) {
        for (const filePath of storageFilePaths) {
          const fileName = path.basename(filePath);
          const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
          await bucket.file(filePath).download({ destination: tempFilePath });
          tempLocalFiles.push(tempFilePath);

          const [metadata] = await bucket.file(filePath).getMetadata();
          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: metadata.contentType || 'application/pdf',
            displayName: "Dokumen Lampiran"
          });

          let fileState = await fileManager.getFile(uploadResult.file.name);
          while (fileState.state === "PROCESSING") {
            await new Promise(r => setTimeout(r, 5000));
            fileState = await fileManager.getFile(uploadResult.file.name);
          }
          if (fileState.state === "FAILED") throw new Error(`Pemrosesan file media gagal.`);

          uploadedGeminiFiles.push(uploadResult.file);
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
        }
      }

      let fewShotContext = "";
      try {
         const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
         const ragQuery = `Track: ${trackType}, Data Bisnis: ${JSON.stringify(formData)}`;
         const embedResult = await embedModel.embedContent(ragQuery);
         const vectorQuery = db.collection('business_vectors')
           .findNearest('embedding', admin.firestore.FieldValue.vector(embedResult.embedding.values), { limit: 2, distanceMeasure: 'COSINE' });
         const vectorSnap = await vectorQuery.get();
         if (!vectorSnap.empty) {
            fewShotContext = `\n[KONTEKS RAG INDUSTRI]: Gunakan profil bisnis serupa yang pernah dievaluasi ini sebagai pembanding kalibrasi: ` +
              vectorSnap.docs.map(d => `(${d.data().namaUsaha} | Kesiapan: ${d.data().readinessLevel} | Skor: ${d.data().score})`).join(", ");
         }
      } catch (err) { console.warn("RAG Vector search dilewati."); }

      // FORMAT DATA LEBIH RAPI UNTUK AI
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

      // PROSES DYNAMIC TAGS JIKA ADA (contoh: {{namaUsaha}})
      let finalSystemPrompt = aiPromptConfig.customSystemPrompt || '';
      finalSystemPrompt = finalSystemPrompt.replace(/{{namaUsaha}}/g, formData.namaUsaha || 'Entitas Terkait');
      finalSystemPrompt = finalSystemPrompt.replace(/{{sektorIndustri}}/g, formData.sektorIndustri || 'Sektor Usaha');

      // INJEKSI ADVANCED PROMPT
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
        
        // PARAMETER BARU YG SEBELUMNYA HILANG
        customSystemPrompt: finalSystemPrompt,
        negativePrompts: aiPromptConfig.negativePrompts,
        formatInstructions: aiPromptConfig.formatInstructions,
        customScoringRubric: aiPromptConfig.customScoringRubric
      });

      parts.unshift({ text: mainPromptText });

      const isPro = aiModelType === 'pro';
      const modelName = isPro ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      const systemPrompt = getSystemPrompt(isPro);

      const unifiedModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            // REQUIRED DITAMBAH _internalReasoning UNTUK CHAIN OF THOUGHT AI
            required: ["_internalReasoning", "readinessLevel", "totalScore", "incubationRoute", "executiveSummary", "customAnalysisBlocks", "fileAnalysisInsights", "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"],
            properties: {
              _internalReasoning: { 
                type: SchemaType.STRING, 
                description: "RUANG BERPIKIR AI: Gunakan field ini untuk berpikir langkah-demi-langkah, mencari korelasi antar jawaban form, dan mensintesis kekuatan/kelemahan utama SEBELUM memberikan skor final." 
              },
              executiveSummary: { type: SchemaType.STRING },
              readinessLevel: { 
                type: SchemaType.STRING, 
                description: `Format WAJIB: '[Nama Tier/Kuadran Utama] | [3-5 kata sifat spesifik yang menggambarkan entitas ini]'. DILARANG KERAS memasukkan deskripsi panjang atau angka rentang skor ke dalam field ini.` 
              },
              totalScore: { type: SchemaType.INTEGER },
              incubationRoute: { type: SchemaType.STRING },
              customAnalysisBlocks: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["title", "iconType", "metrics"],
                  properties: {
                    title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING },
                    metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "value"], properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING } } } }
                  }
                }
              },
              fileAnalysisInsights: {
                type: SchemaType.OBJECT,
                required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"],
                properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } }
              },
              metrics: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } }
              },
              swotAnalysis: {
                type: SchemaType.OBJECT,
                required: ["strengths", "weaknesses", "opportunities", "threats"],
                properties: { strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
              },
              recommendations: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.OBJECT, required: ["title", "content"], properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } } }
              },
              riskAssessment: {
                type: SchemaType.OBJECT,
                required: ["criticalRisks", "mitigationStrategies"],
                properties: { criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
              },
              nextActionSteps: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.OBJECT, required: ["timeframe", "task"], properties: { timeframe: { type: SchemaType.STRING }, task: { type: SchemaType.STRING } } }
              }
            }
          }
        }
      });

      const result = await withRetry(() => unifiedModel.generateContent({ contents: [{ role: "user", parts }] }));
      const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResultJson = JSON.parse(cleanText);

      // Hapus _internalReasoning agar tidak disimpan ke database dan memakan memori
      if(aiResultJson._internalReasoning) delete aiResultJson._internalReasoning;

      let assessmentId = "";
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

        import("./documentGenerator").then(({ generateInternalPDF }) => {
          generateInternalPDF(assessmentId, updatedDocData, 'user').catch(e => console.error(e));
          generateInternalPDF(assessmentId, updatedDocData, 'curator').catch(e => console.error(e));
        });

        const smtpEmail = smtpEmailSecret.value();
        const smtpPassword = smtpPasswordSecret.value();
        if (smtpEmail && smtpPassword && updatedDocData.userEmail) {
          import("./emailService").then(({ sendAssessmentEmail }) => {
            sendAssessmentEmail(smtpEmail, smtpPassword, {
              targetEmail: String(updatedDocData.userEmail),
              namaUsaha: String(updatedDocData.namaUsaha || 'Bisnis Anda'),
              totalScore: Number(aiResultJson.totalScore || 0),
              readinessLevel: String(aiResultJson.readinessLevel || 'Belum Ditentukan'),
              trackType: String(updatedDocData.trackType || 'Evaluasi Umum'),
              assessmentUrl: `https://curation--teknopark-surakarta.asia-southeast1.hosted.app/result/${assessmentId}`
            }).catch(e => console.error(e));
          });
        }

        if (aiResultJson.totalScore && aiResultJson.totalScore >= 80) {
          import("./vectorService").then(({ generateAndStoreVectorEmbedding }) => {
            generateAndStoreVectorEmbedding(assessmentId, updatedDocData, API_KEY).catch(e => console.error(e));
          });
        }
      });

      return { assessmentId, aiResult: aiResultJson };

    } catch (error: any) {
      console.error("Cloud Function Error:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses analisis AI.");
    } finally {
      for (const tmpFile of tempLocalFiles) { try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {} }
      for (const geminiFile of uploadedGeminiFiles) { try { await fileManager.deleteFile(geminiFile.name); } catch (e) {} }
    }
  }
);