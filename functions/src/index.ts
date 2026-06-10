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

// IMPOR FUNGSI EMAIL DARI FILE TERPISAH
import { sendAssessmentEmail } from "./emailService";

admin.initializeApp();

const db = getFirestore(admin.app(), "curation");

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
// DEKLARASI SECRET UNTUK EMAIL (Pastikan Anda sudah menyetelnya di Firebase CLI)
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

export const processCurationAssessment = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
    cors: [
      "https://curation--teknopark-surakarta.asia-southeast1.hosted.app",
      "http://localhost:3000"
    ],
  },
  async (request) => {
    // FASE 0: VALIDASI AUTENTIKASI
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Akses ditolak. Pengguna harus login.");
    }
    const userId = request.auth.uid; 
    const userEmail = request.auth.token.email || '';

    const data = request.data as any;
    if (!data) throw new HttpsError("invalid-argument", "Data request kosong.");

    const formData = data.formData || {};
    const trackType = data.trackType || "Evaluasi Umum";
    const aiPromptConfig = data.aiPromptConfig;
    const aiModelType = data.aiModelType || 'pro';
    const tokenUsed = data.tokenUsed;
    const storageFilePaths = data.storageFilePaths || [];
    
    const API_KEY = geminiApiKeySecret.value();
    if (!API_KEY) throw new HttpsError("internal", "API Key AI tidak dikonfigurasi.");

    const fileManager = new GoogleAIFileManager(API_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    let corporateEntityName = null;
    const uploadedGeminiFiles: any[] = [];
    const tempLocalFiles: string[] = [];

    // FASE 1: PRE-VALIDASI TOKEN
    if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
      const lastDashIndex = tokenUsed.lastIndexOf('-');
      const corpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      const corpRef = db.collection('corporate_tokens').doc(corpId);
      const corpDoc = await corpRef.get();

      if (!corpDoc.exists) throw new HttpsError("not-found", `Entitas korporat tidak ditemukan.`);
      const corpData = corpDoc.data();
      const tokenData = (corpData?.tokens || {})[tokenCode];

      if (!tokenData) throw new HttpsError("not-found", `Kode token tidak ditemukan.`);
      if (tokenData.isUsed) throw new HttpsError("permission-denied", "Token ini sudah pernah digunakan.");

      corporateEntityName = corpData?.corporateName || corpId;
    }

    try {
      const parts: any[] = [];
      const bucket = admin.storage().bucket(); 
      
      // FASE 2: INTERNAL FILE TRANSFER & POLLING
      if (storageFilePaths && storageFilePaths.length > 0) {
        for (const filePath of storageFilePaths) {
          const fileName = path.basename(filePath);
          const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
          
          await bucket.file(filePath).download({ destination: tempFilePath });
          tempLocalFiles.push(tempFilePath);
          
          const [metadata] = await bucket.file(filePath).getMetadata();
          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: metadata.contentType || 'application/pdf',
            displayName: "Dokumen Lampiran Asesmen"
          });
          
          let fileState = await fileManager.getFile(uploadResult.file.name);
          while (fileState.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            fileState = await fileManager.getFile(uploadResult.file.name);
          }
          if (fileState.state === "FAILED") throw new Error(`Pemrosesan file media gagal.`);

          uploadedGeminiFiles.push(uploadResult.file);
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
        }
      }

      // FASE 3: PERSIAPAN PROMPT DINAMIS & ENTERPRISE RULES
      const isPro = aiModelType === 'pro';
      const selectedModelName = isPro ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      
      const textData: Record<string, any> = {};
      for (const key in formData) {
        const val = formData[key];
        if (typeof val !== 'string' || !val.startsWith('http')) {
          if (val !== null && val !== undefined && val !== '') {
            const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
            textData[readableKey] = val;
          }
        }
      }

      const dataString = Object.entries(textData).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
      const trackContext = trackType;
      const aiPersona = aiPromptConfig?.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA";
      const assessmentGoal = aiPromptConfig?.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat.";
      
      const strictness = aiPromptConfig?.gradingStrictness || 'standard';
      let strictnessInstruction = "Lakukan penilaian secara objektif.";
      if (strictness === 'strict') strictnessInstruction = "Lakukan penilaian SANGAT KETAT selevel audit Venture Capital.";
      if (strictness === 'supportive') strictnessInstruction = "Lakukan penilaian yang suportif dan edukatif.";

      const tone = aiPromptConfig?.reportTone || 'consultative';
      let toneInstruction = "Gaya bahasa: Konsultatif & Solutif.";
      if (tone === 'investigative') toneInstruction = "Gaya bahasa: Investigatif & Analitis.";
      if (tone === 'academic') toneInstruction = "Gaya bahasa: Akademis Formal.";

      const customTiers = aiPromptConfig?.customReadinessTiers || [];
      const tiersString = customTiers.length > 0 ? customTiers.map((t: string) => `"${t}"`).join(', ') : '"Pra-Inkubasi", "Siap Akselerasi", "Lulus Investasi"';
      const riskInstruction = aiPromptConfig?.riskFramework ? `FOKUS IDENTIFIKASI RISIKO WAJIB: ${aiPromptConfig.riskFramework}` : "Identifikasi risiko operasional.";
      const targetAnalysisBlocks = aiPromptConfig?.expectedAnalysisBlocks?.map((block: string) => `- ${block}`).join("\n") || "- Posisi Pasar\n- Kesehatan Finansial\n- Kapabilitas Tim";
      const targetMetrics = aiPromptConfig?.expectedMetrics || ["Validasi Pasar", "Keuangan", "Tim", "Skalabilitas", "Legalitas"];

      const promptText = `
ANDA ADALAH: ${aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil berikut dalam kategori: "${trackContext}".

TUJUAN UTAMA: ${assessmentGoal}
ATURAN PENILAIAN: ${strictnessInstruction}
ATURAN GAYA BAHASA: ${toneInstruction}

DATA TEKS FORM:
${dataString}

${storageFilePaths && storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. BACA DAN SILANGKAN DATANYA." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Ringkasan padat entitas ini.
2. FILE ANALYSIS: Nilai validitas lampiran media.
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis MERUJUK KETAT pada daftar berikut:
${targetAnalysisBlocks}
4. METRICS ARRAY: Skor objektif (0-100) untuk: [${targetMetrics.join(", ")}].
5. SWOT & RISKS: Petakan SWOT. Buat 'Critical Risks' dan 'Mitigation Strategies'. ${riskInstruction}
6. ACTION PLAN: Buat rekomendasi dengan Timeframe.
7. SCORING & TIERING: 
   - "totalScore" (0-100).
   - "readinessLevel" HANYA DARI: [${tiersString}].
   - Tentukan "incubationRoute".

Output MURNI format JSON. BAHASA INDONESIA.
`;

      parts.unshift({ text: promptText });
      const systemPrompt = isPro ? "Anda adalah AI Evaluator Premium. Output format JSON." : "Anda adalah AI Evaluator Standar. Output format JSON.";

      const model = genAI.getGenerativeModel({
        model: selectedModelName,
        systemInstruction: systemPrompt,
        tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.3 } } } as any],
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["readinessLevel", "totalScore", "incubationRoute", "executiveSummary", "customAnalysisBlocks", "fileAnalysisInsights", "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"],
            properties: {
              executiveSummary: { type: SchemaType.STRING },
              readinessLevel: { type: SchemaType.STRING },
              totalScore: { type: SchemaType.INTEGER },
              incubationRoute: { type: SchemaType.STRING },
              customAnalysisBlocks: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "iconType", "metrics"], properties: { title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING }, metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING } } } } } } },
              fileAnalysisInsights: { type: SchemaType.OBJECT, required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"], properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } } },
              metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } },
              swotAnalysis: { type: SchemaType.OBJECT, required: ["strengths", "weaknesses", "opportunities", "threats"], properties: { strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } },
              recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "content"], properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } } } },
              riskAssessment: { type: SchemaType.OBJECT, required: ["criticalRisks", "mitigationStrategies"], properties: { criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } },
              nextActionSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["timeframe", "task"], properties: { timeframe: { type: SchemaType.STRING }, task: { type: SchemaType.STRING } } } }
            }
          }
        }
      });

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResultJson = JSON.parse(cleanText);

      // FASE 4: TRANSACTION DATABASE
      let assessmentId = "";
      await db.runTransaction(async (transaction) => {
        if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
          const lastDashIndex = tokenUsed.lastIndexOf('-');
          const rawCorpId = tokenUsed.substring(0, lastDashIndex);
          const rawTokenCode = tokenUsed.substring(lastDashIndex + 1);
          
          const corpId = rawCorpId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const tokenCode = rawTokenCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          
          const corpRefToUpdate = db.collection('corporate_tokens').doc(corpId);
          const cDoc = await transaction.get(corpRefToUpdate);
          if (!cDoc.exists) throw new Error(`Entitas ${corpId} tidak ditemukan.`);

          const corpData = cDoc.data();
          const tData = (corpData?.tokens || {})[tokenCode];
          if (!tData) throw new Error(`Token ${tokenCode} tidak ditemukan.`);
          if (tData.isUsed) throw new Error("Token telah digunakan secara paralel.");

          transaction.update(corpRefToUpdate, {
            [`tokens.${tokenCode}.isUsed`]: true,
            [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
            [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
            usedCount: admin.firestore.FieldValue.increment(1)
          });
        }

        const newAssessmentRef = db.collection("assessments").doc();
        assessmentId = newAssessmentRef.id;
        
        transaction.set(newAssessmentRef, {
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
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // =========================================================
      // FASE 4.5: PEMANGGILAN MODUL EMAIL (NON-BLOCKING)
      // =========================================================
      const smtpEmail = smtpEmailSecret.value();
      const smtpPassword = smtpPasswordSecret.value();
      const targetEmail = formData.email || userEmail;

      if (smtpEmail && smtpPassword && targetEmail) {
        const assessmentUrl = `https://curation--teknopark-surakarta.asia-southeast1.hosted.app/result/${assessmentId}`;
        
        // Panggil fungsi secara asinkron tanpa 'await' agar Firebase Function bisa langsung mengembalikan respons ke Frontend tanpa harus menunggu pengiriman email selesai.
        sendAssessmentEmail(smtpEmail, smtpPassword, {
          targetEmail: targetEmail,
          namaUsaha: formData.namaUsaha || 'Bisnis Anda',
          totalScore: aiResultJson.totalScore,
          readinessLevel: aiResultJson.readinessLevel,
          trackType: trackType,
          assessmentUrl: assessmentUrl
        }).catch(err => console.error("Kegagalan pada pemanggilan modul email:", err));
      }

      return { assessmentId, aiResult: aiResultJson };

    } catch (error: any) {
      console.error("Cloud Function Error:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI.");
    } finally {
      // FASE 5: GARBAGE COLLECTION
      for (const tmpFile of tempLocalFiles) {
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
      }
      for (const geminiFile of uploadedGeminiFiles) {
        try { await fileManager.deleteFile(geminiFile.name); } catch (e) {}
      }
    }
  }
);