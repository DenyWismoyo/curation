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
export { generatePDFReport } from "./general/documentGenerator";
export { matchBusinessWithIndustry } from "./general/vectorService";
// export { generateFormTemplateFromAI } from "./formBuilderService";
export { createPaymentInvoice, mayarWebhook, redeemAssessmentQuota, checkTokenValidity } from "./general/paymentService";
export { chatWithOmniAi } from "./general/omniAiService";
export { generateActionPlanChecklist, generateSubTaskChecklist } from "./actionPlanService";
export { generateTemplateSellingPoints, generatePromptAnchors } from "./outputService";
export { weeklyActionPlanNudge } from "./email/nudgeService";
export { generateAdaptiveQuestions, evaluateMacroBranching, manualTriggerRAGSeed } from "./general/adaptiveValidationService";
export { enhanceFieldLogic, enhanceStepLogic } from "./fieldEnhancerService";
// TAMBAHKAN EXPORT FUNGSI BARU DI SINI:
export { generateAssessmentCacheKey, getCachedAssessmentResult, setCachedAssessmentResult } from "./general/cacheService";
export { generateAdvancedPrompts } from "./promptEnhancerService";
export { processVoiceInput } from "./general/voiceService";
export { analyzeEvidence } from "./general/evidenceService";

export { formBuilderArchitectAgent } from "./agents/formBuilder/architectAgent";
export { formBuilderFabricatorAgent } from "./agents/formBuilder/fabricatorAgent";
export { formBuilderValidatorAgent } from "./agents/formBuilder/validatorAgent";
export { formBuilderRagSeederAgent } from "./agents/formBuilder/ragSeederAgent";
export { processCurationAssessment } from "./agents/assessment/gatewayAgent";
export { assessmentTriangulatorAgent } from "./agents/assessment/triangulatorAgent";
export { assessmentDomainExpertsAgent } from "./agents/assessment/domainExpertsAgent";
export { assessmentTacticalPlannerAgent } from "./agents/assessment/tacticalPlannerAgent";
export { assessmentSynthesisAgent } from "./agents/assessment/synthesisAgent";
export { assessmentPostProcessingAgent } from "./agents/assessment/postProcessingAgent";
export { adminGenerateMockData } from "./agents/assessment/mockDataAgent";
export { premiumConsultationChat } from "./agents/assessment/premiumConsultationAgent";
export { assessmentAnalyticsAgent } from "./agents/analytics/analyticsAgent";
export { generateCopywriting, reviseSlidePrompt, reviseCopywriting } from "./agents/promo/copywriterAgent";
export { renderSingleSlide } from "./agents/promo/imageRendererAgent";
export { generateArticleFromTemplate } from "./agents/promo/articleAgent";
export { batchGenerateSmartPricing } from "./agents/promo/pricingAgent";
export { generateProgramIdentity } from "./agents/promo/identityAgent";
export { generateArticleImage } from "./agents/promo/articleImageAgent";
export { createOrGetAffiliateProfile, attachAffiliateToTransaction, updateAffiliatePayoutProfile, adminReviewAffiliatePayout, adminMarkAffiliateCommissionPaid, getAffiliateProgramConfigPublic, adminUpdateAffiliateProgramConfig } from "./agents/affiliate/affiliateAgent";
export { affiliateCommissionAgent } from "./agents/affiliate/commissionAgent";
export { upsertReferralAttribution, bindReferralAttributionToUser } from "./agents/affiliate/attributionAgent";
export { generateAdaptiveOnboardingPlan } from "./agents/onboarding/adaptiveOnboardingAgent";
export { adminUpsertB2BOrganization, adminListB2BOrganizations, adminSetB2BUserAccess, adminRevokeB2BUserAccess } from "./agents/b2b/organizationAgent";
export { getB2BOrganizationAnalytics } from "./agents/b2b/b2bAnalyticsService";
export { b2bAddInteractionLog, b2bGenerateInteractionSummary } from "./agents/b2b/interactionAgent";


// ============================================================================
// INISIALISASI FIREBASE
// ============================================================================
admin.initializeApp();
const db = getFirestore(admin.app(), "curation");

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

// FUNGSI RETRY EXPONENTIAL BACKOFF TINGKAT TINGGI
const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delayMs = 3000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    
    console.warn(`[API sibuk/Error JSON] Mencoba ulang. Sisa percobaan: ${retries - 1}...`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

// ============================================================================
// CLOUD FUNCTION: ASESMEN AI UTAMA (MULTI-AGENT ARCHITECTURE)
// ============================================================================
/*export const processCurationAssessment = onCall({
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
    const trackType = data.trackType || formData.trackType || "Evaluasi Umum";
    
    const tokenUsed = data.tokenUsed || formData.tokenUsed || data.token || formData.token || null;
    let corporateEntityName = null;
    let allowedDocTemplates: string[] = [];
    
    const aiPromptConfig = data.aiPromptConfig || {};
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
              parts.push({
                  text: `[SYSTEM NOTE]: Pengguna melampirkan berkas bukti "${fileName}". Secara administratif BUKTI TELAH DILAMPIRKAN. Anggap klaim pengguna tervalidasi.`
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

            if (fileState.state === "FAILED" || fileState.state === "PROCESSING") continue; 

            uploadedGeminiFiles.push(uploadResult.file);
            parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
            
          } catch (fileErr: any) {
            console.warn(`[FAIL-SAFE] Gagal mengunggah file ke Gemini API.`, fileErr);
          }
        }
      }

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
      } catch (err) { }

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

      const targetAudience = aiPromptConfig.targetAudience || 'company';
      
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
        customScoringRubric: aiPromptConfig.customScoringRubric,
        targetAudience: targetAudience
      });
      
      parts.unshift({ text: mainPromptText });
      const systemPrompt = getSystemPrompt(true);

      const masterModel = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192, 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["_internalReasoning", "readinessLevel", "totalScore", "dataConfidenceScore", "contradictionsFound", "incubationRoute", "executiveSummary", "swotAnalysis", "riskAssessment"],
            properties: {
              _internalReasoning: { type: SchemaType.STRING },
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
              }
            }
          }
        }
      });

      const masterPromptOverride = `
        ${parts[0].text}
        ==================================================
        PERHATIAN TUGAS MASTER AGENT (SANGAT PENTING & MUTLAK):
        ==================================================
        1. Tugas Anda SAAT INI HANYA mengisi kerangka JSON utama: "_internalReasoning", "totalScore", "readinessLevel", "dataConfidenceScore", "contradictionsFound", "incubationRoute", "swotAnalysis", "riskAssessment", dan "executiveSummary".
        2. DILARANG KERAS mengerjakan, menjabarkan, atau menyusupkan teks untuk "Custom Analysis Blocks", "Metrics Array", "File Analysis", atau "Action Plan" ke dalam properti 'executiveSummary'! Bagian tersebut BUKAN TUGAS ANDA, melainkan tugas Worker Agents di fase berikutnya.
        3. INSTRUKSI KHUSUS 'executiveSummary': Rangkum analisis Anda dalam 5-8 poin utama yang padat. WAJIB gunakan karakter '\\n' (slash n) untuk memisahkan setiap poin. JANGAN DIGABUNG menjadi 1 paragraf panjang lurus!
      `;

      const masterParts = [{ text: masterPromptOverride }, ...parts.slice(1)];
      
      const masterJson = await withRetry(async () => {
        const masterResult = await masterModel.generateContent({ contents: [{ role: "user", parts: masterParts }] });
        let masterRawText = masterResult.response.text().trim();
        if (masterRawText.startsWith('```')) masterRawText = masterRawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
        return JSON.parse(masterRawText);
      });

      const getWorkerModel = (schema: any) => genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Anda adalah AI Content Elaborator berkecepatan tinggi. Tugas Anda mengekstrak wawasan dari data mentah menjadi narasi yang SANGAT PRESISI. OUTPUT WAJIB BERUPA JSON VALID. DILARANG KERAS MENGGUNAKAN NEWLINE/ENTER HARFIAH KECUALI MENGGUNAKAN '\\n'.",
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema }
      });

      const isIndividual = targetAudience === 'individual';
      const audienceContext = isIndividual 
          ? "TARGET AUDIENS KETAT: INDIVIDU / PEGAWAI / PERSONAL. DILARANG KERAS menggunakan istilah B2B, strategi perusahaan, omzet, atau valuasi. Fokus pada pengembangan diri, karir, dan psikologi."
         : "TARGET AUDIENS: PERUSAHAAN / BISNIS. Gunakan bahasa profesional korporat, fokus pada metrik bisnis, ekspansi, dan skalabilitas.";

      const workerABlocks = async () => {
        try {
          const schemaA = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "iconType", "metrics"], properties: { title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING }, metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "value"], properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING } } } } } } };
          const promptA = `JABARKAN narasi analitis HANYA untuk kerangka blok standar ini: ${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}. \nData subjek: ${dataString}. \nSesuaikan narasi Anda dengan temuan dari Master Assessor: ${JSON.stringify(masterJson.swotAnalysis)}.\nKONTEKS AUDIENS: ${audienceContext}\nATURAN KONDISIONAL KHUSUS: ${aiPromptConfig.customSystemPrompt || 'Gunakan logika analisis yang relevan.'}\nPANTANGAN (DILARANG KERAS): ${aiPromptConfig.negativePrompts || 'Tidak ada pantangan khusus, namun jaga gaya bahasa.'}`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaA).generateContent(promptA);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { return []; }
      };

      const workerBMetrics = async () => {
        try {
          const schemaB = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
          const promptB = `Berikan justifikasi evaluasi naratif dan skor (0-100) HANYA untuk daftar metrik pilar baku ini: ${JSON.stringify(aiPromptConfig.expectedMetrics)}. \nData Subjek: ${dataString}. \nSkor Akhir subjek ini adalah ${masterJson.totalScore}/100. Pastikan nilai (score) selaras.\nKONTEKS AUDIENS: ${audienceContext}\nATURAN KONDISIONAL KHUSUS: ${aiPromptConfig.customSystemPrompt || 'Gunakan logika analisis yang relevan.'}\nPANTANGAN (DILARANG KERAS): ${aiPromptConfig.negativePrompts || 'Tidak ada pantangan khusus, namun jaga gaya bahasa.'}`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaB).generateContent(promptB);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { return []; }
      };

      const workerCRecommendations = async () => {
        try {
          const schemaC = { type: SchemaType.OBJECT, required: ["recommendations", "nextActionSteps"], properties: { recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "content"], properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } } } }, nextActionSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["timeframe", "task"], properties: { timeframe: { type: SchemaType.STRING }, task: { type: SchemaType.STRING } } } } } };
          const promptC = `Buat Rencana Tindakan TAKTIS HANYA untuk area rekomendasi ini: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}. \nFokuskan pada risiko utama ini: ${JSON.stringify(masterJson.riskAssessment.criticalRisks)}.\nKONTEKS AUDIENS: ${audienceContext}\nATURAN KONDISIONAL KHUSUS: ${aiPromptConfig.customSystemPrompt || 'Gunakan logika analisis yang relevan.'}\nPANTANGAN (DILARANG KERAS): ${aiPromptConfig.negativePrompts || 'Tidak ada pantangan khusus.'}\nATURAN GAYA ACTION PLAN (MUTLAK): ${aiPromptConfig.actionPlanBehavior || 'Sesuaikan rekomendasi dengan profil target audiens secara natural.'}`;
          
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaC).generateContent(promptC);
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { return { recommendations: [], nextActionSteps: [] }; }
      };

      const workerDFiles = async () => {
        if (!storageFilePaths || storageFilePaths.length === 0 || uploadedGeminiFiles.length === 0) return null;
        try {
          const schemaD = { type: SchemaType.OBJECT, required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"], properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } } };
          const promptD = `Lakukan analisis FORENSIK terhadap dokumen lampiran. Bandingkan isinya dengan klaim teks berikut dan cari kesenjangannya: ${dataString}.`;
          
          const fileParts = [{ text: promptD }, ...parts.slice(1)];
          return await withRetry(async () => {
            const res = await getWorkerModel(schemaD).generateContent({ contents: [{ role: "user", parts: fileParts }] });
            let text = res.response.text().trim();
            if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
            return JSON.parse(text);
          });
        } catch (e) { return null; }
      };

      const finalBlocks = await workerABlocks();
      const finalMetrics = await workerBMetrics();
      const finalRecommendations = await workerCRecommendations();
      const finalFiles = await workerDFiles();
      
      const publicAiResult = {
        executiveSummary: masterJson.executiveSummary || "",
        readinessLevel: masterJson.readinessLevel || "Belum Ditentukan",
        totalScore: masterJson.totalScore || 0,
        incubationRoute: masterJson.incubationRoute || "",
        riskAssessment: masterJson.riskAssessment || {},
        recommendations: finalRecommendations?.recommendations || [],
        nextActionSteps: finalRecommendations?.nextActionSteps || [],
        formPurpose: aiPromptConfig.formPurpose || 'assessment',
        targetAudience: targetAudience,
        customUiLabels: aiPromptConfig.customUiLabels || {},
        actionPlanBehavior: aiPromptConfig.actionPlanBehavior || ""
      };

      const internalAiResult = {
        _internalReasoning: masterJson._internalReasoning || "",
        dataConfidenceScore: masterJson.dataConfidenceScore || 0,
        contradictionsFound: masterJson.contradictionsFound || [],
        swotAnalysis: masterJson.swotAnalysis || {},
        customAnalysisBlocks: finalBlocks || [],
        metrics: finalMetrics || [],
        fileAnalysisInsights: finalFiles || null,
      };

      const fullAiResultForBg = { ...publicAiResult, ...internalAiResult };
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
          allowPublicRead: true,
          publicResult: true,
          shareable: true,
          namaUsaha: formData.namaUsaha || 'Tanpa Nama',
          whatsapp: formData.whatsapp || '',
          score: publicAiResult.totalScore || 0,
          readinessLevel: publicAiResult.readinessLevel || 'Belum Ditentukan',
          formData: formData,
          aiResult: publicAiResult, 
          tokenUsed: tokenUsed || null, 
          allowedDocumentTemplates: allowedDocTemplates,
          documentGenerationQuota: tokenUsed ? 1 : 0, 
          hasPaidForDocument: false,
          status: "COMPLETED", 
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(newAssessmentRef, updatedDocData);

        const internalDocRef = newAssessmentRef.collection("internal").doc("details");
        transaction.set(internalDocRef, internalAiResult);
      });

      const updatedDocDataForBg = { 
         namaUsaha: formData.namaUsaha || 'Tanpa Nama', 
         trackType: trackType, 
         score: fullAiResultForBg.totalScore || 0, 
         readinessLevel: fullAiResultForBg.readinessLevel || 'Belum Ditentukan', 
         formData: formData, 
         aiResult: fullAiResultForBg,
         userEmail: formData.email || userEmail
      };
      
      await Promise.allSettled([
        (async () => {
          if (fullAiResultForBg.totalScore !== undefined && fullAiResultForBg.totalScore !== null) {
            try {
                const { generateAndStoreVectorEmbedding } = await import("./vectorService");
                await generateAndStoreVectorEmbedding(assessmentId, updatedDocDataForBg, API_KEY);
            } catch (err) { }
          }
        })(),
        (async () => {
           try {
             const { generateInternalPDF } = await import("./documentGenerator");
             await generateInternalPDF(assessmentId, updatedDocDataForBg, 'user');
             await generateInternalPDF(assessmentId, updatedDocDataForBg, 'curator');
           } catch (err) { }
        })(),
        (async () => {
          const smtpEmail = smtpEmailSecret.value();
          const smtpPassword = smtpPasswordSecret.value();
          if (smtpEmail && smtpPassword && updatedDocDataForBg.userEmail) {
            try {
                const { sendAssessmentEmail } = await import("./emailService");
                await sendAssessmentEmail(smtpEmail, smtpPassword, {
                  targetEmail: String(updatedDocDataForBg.userEmail),
                  namaUsaha: String(updatedDocDataForBg.namaUsaha),
                  totalScore: Number(fullAiResultForBg.totalScore || 0),
                  readinessLevel: String(fullAiResultForBg.readinessLevel),
                  trackType: String(updatedDocDataForBg.trackType),
                  assessmentUrl: `https://omnifit.cloud/result/${assessmentId}`
                });
            } catch (err) { }
          }
        })()
      ]);

      return { assessmentId, aiResult: fullAiResultForBg };
      
    } catch (error: any) {
      throw new HttpsError("internal", error.message || "Gagal memproses analisis AI.");
    } finally {
      for (const tmpFile of tempLocalFiles) {
          try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
        }
      for (const geminiFile of uploadedGeminiFiles) {
          try { await withRetry(() => fileManager.deleteFile(geminiFile.name), 2, 2000); } catch (e) {}
        }
    }
  }
); */