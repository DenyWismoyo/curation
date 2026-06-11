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

// EXPORT FUNGSI GENERATOR DOKUMEN WORD
export { generateDocumentDraft } from "./documentGenerator";

admin.initializeApp();

const db = getFirestore(admin.app(), "curation");

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

export const processCurationAssessment = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
    cors: true,
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
    let allowedDocTemplates: string[] = []; // Tetap dideklarasikan untuk jaga-jaga
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
      allowedDocTemplates = corpData?.allowedDocumentTemplates || [];
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
      
      // -- SINKRONISASI DARI ADMIN TEMPLATES --
      const aiPersona = aiPromptConfig?.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA";
      const assessmentGoal = aiPromptConfig?.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat, menganalisis potensi, dan memberikan rekomendasi strategis.";
      
      const strictness = aiPromptConfig?.gradingStrictness || 'standard';
      let strictnessInstruction = "Lakukan penilaian secara objektif dan berimbang sesuai standar industri.";
      if (strictness === 'strict') strictnessInstruction = "Lakukan penilaian SANGAT KETAT selevel audit Venture Capital. Bersikaplah skeptis, cari celah fatal, dan berikan skor sesuai porsi.";
      if (strictness === 'supportive') strictnessInstruction = "Lakukan penilaian yang suportif dan edukatif. Fokus pada potensi perbaikan dan pertumbuhan.";

      const tone = aiPromptConfig?.reportTone || 'consultative';
      let toneInstruction = "Gaya bahasa: Konsultatif & Solutif (seperti mentor yang membimbing).";
      if (tone === 'investigative') toneInstruction = "Gaya bahasa: Investigatif & Analitis (tajam, kritis, langsung pada intinya).";
      if (tone === 'academic') toneInstruction = "Gaya bahasa: Akademis Formal (objektif, terstruktur, berbasis data).";

      const customTiers = aiPromptConfig?.customReadinessTiers || [];
      const tiersString = customTiers.length > 0 ? customTiers.map((t: string) => `"${t}"`).join(', ') : '"Pra-Inkubasi", "Siap Akselerasi", "Lulus Investasi"';
      
      const riskFramework = aiPromptConfig?.riskFramework || '';
      const riskInstruction = riskFramework ? `FOKUS IDENTIFIKASI RISIKO WAJIB: ${riskFramework}` : "Identifikasi risiko operasional, finansial, dan pasar secara umum.";
      
      const targetAnalysisBlocks = aiPromptConfig?.expectedAnalysisBlocks?.map((block: string) => `- ${block}`).join("\n") || "- Posisi Pasar\n- Kesehatan Finansial\n- Kapabilitas Tim";
      const targetMetrics = aiPromptConfig?.expectedMetrics || ["Validasi Pasar", "Keuangan", "Tim", "Skalabilitas", "Legalitas"];
      
      const targetRecommendations = aiPromptConfig?.expectedRecommendations?.map((rec: string) => `- ${rec}`).join("\n") || "- Strategi Bisnis\n- Rencana Pendanaan";
      const mediaFocus = aiPromptConfig?.mediaAnalysisFocus ? `Fokus Evaluasi Media: Aspek ${aiPromptConfig.mediaAnalysisFocus}.` : '';

      const promptText = `
ANDA ADALAH: ${aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${trackContext}".

TUJUAN UTAMA: ${assessmentGoal}
ATURAN PENILAIAN (SKOR): ${strictnessInstruction}
ATURAN GAYA BAHASA: ${toneInstruction}

DATA TEKS FORM:
${dataString}

${storageFilePaths && storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Buat ringkasan padat dan analitis tentang entitas ini sesuai tujuan asesmen. (Hasilkan dalam format POIN-POIN).
2. FILE ANALYSIS: Nilai validitas dokumen ataupun lampiran media. Catat jika ada ketidaksesuaian dengan isi formulir. (Hasilkan dalam format POIN-POIN). ${mediaFocus}
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut.
Pastikan Anda menjabarkan nilai indikator (label) secara mendetail dan analitis. (Hasilkan DALAM BENTUK 2-3 POIN SINGKAT DAN TAJAM. Gunakan ENTER/NEWLINE untuk memisahkan setiap poin).
${targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${targetMetrics.join(", ")}]. (Deskripsi alasan wajib disajikan dalam bentuk POIN-POIN/NEWLINE).
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan. ${riskInstruction}
6. ACTION PLAN: Buat rekomendasi strategis HANYA UNTUK AREA BERIKUT dengan Timeframe spesifik. (Konten rekomendasi wajib berupa POIN-POIN TERSTRUKTUR):
${targetRecommendations}
7. SCORING & TIERING: 
   - Berikan "totalScore" (0-100) sesuai aturan penilaian di atas.
   - Penentuan "readinessLevel" WAJIB memilih HANYA DARI SALAH SATU STATUS BERIKUT: [${tiersString}].
   - Tentukan "incubationRoute".

ATURAN MUTLAK: Output MURNI dalam format JSON. JAWABAN WAJIB BERBAHASA INDONESIA. Jangan gunakan teks paragraf panjang, usahakan semuanya berbentuk poin baris baru.
`;

      parts.unshift({ text: promptText });
      
      const systemPrompt = isPro 
        ? "Anda adalah AI Evaluator Premium. Lakukan analisis mendalam, kritis, deteksi celah logika, dan berikan evaluasi berbasis penalaran tingkat tinggi. Format output selalu terstruktur dalam bentuk bullet-points (newline). Format output hanya JSON berbahasa Indonesia." 
        : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat berdasarkan fakta. Berikan narasi dalam bentuk poin-poin rapi (newline). Format output JSON berbahasa Indonesia.";

      const modelConfig: any = {
        model: selectedModelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["readinessLevel", "totalScore", "incubationRoute", "executiveSummary", "customAnalysisBlocks", "fileAnalysisInsights", "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"],
            properties: {
              executiveSummary: { type: SchemaType.STRING, description: "Ringkasan eksekutif analitis. Wajib dalam bentuk poin-poin utama yang dipisahkan dengan enter (newline)." },
              readinessLevel: { type: SchemaType.STRING, description: `WAJIB pilih salah satu: [${tiersString}]` },
              totalScore: { type: SchemaType.INTEGER },
              incubationRoute: { type: SchemaType.STRING },
              customAnalysisBlocks: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["title", "iconType", "metrics"],
                  properties: {
                    title: { type: SchemaType.STRING },
                    iconType: { type: SchemaType.STRING },
                    metrics: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        required: ["label", "value"],
                        properties: {
                          label: { type: SchemaType.STRING },
                          value: { type: SchemaType.STRING, description: "Penjelasan analitis. WAJIB berupa 2-3 poin ringkas dan tajam. Pisahkan setiap poin dengan enter (newline)." }
                        }
                      }
                    }
                  }
                }
              },
              fileAnalysisInsights: {
                type: SchemaType.OBJECT,
                required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"],
                properties: {
                  documentQuality: { type: SchemaType.STRING, description: "Evaluasi kualitas dokumen dalam bentuk poin-poin (newline)." },
                  keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  discrepancies: { type: SchemaType.STRING, description: "Penjelasan ketidaksesuaian dalam bentuk poin-poin jika ada (newline)." }
                }
              },
              metrics: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["label", "score", "description"],
                  properties: {
                    label: { type: SchemaType.STRING },
                    score: { type: SchemaType.INTEGER },
                    description: { type: SchemaType.STRING, description: "Evaluasi alasan pemberian skor dalam bentuk poin-poin (newline)." }
                  }
                }
              },
              swotAnalysis: {
                type: SchemaType.OBJECT,
                required: ["strengths", "weaknesses", "opportunities", "threats"],
                properties: {
                  strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              },
              recommendations: {
                type: SchemaType.ARRAY,
                items: { 
                  type: SchemaType.OBJECT, 
                  required: ["title", "content"], 
                  properties: { 
                    title: { type: SchemaType.STRING, description: "Judul rekomendasi (Sesuai fokus area)" }, 
                    content: { type: SchemaType.STRING, description: "Langkah strategis konkret berupa poin-poin terstruktur (newline)." } 
                  } 
                }
              },
              riskAssessment: {
                type: SchemaType.OBJECT,
                required: ["criticalRisks", "mitigationStrategies"],
                properties: { 
                  criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, 
                  mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } 
                }
              },
              nextActionSteps: {
                type: SchemaType.ARRAY,
                items: { 
                  type: SchemaType.OBJECT, 
                  required: ["timeframe", "task"], 
                  properties: { 
                    timeframe: { type: SchemaType.STRING }, 
                    task: { type: SchemaType.STRING } 
                  } 
                }
              }
            }
          }
        }
      };

      const model = genAI.getGenerativeModel(modelConfig);
      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      
      const rawText = result.response.text();
      const cleanText = rawText.replace(new RegExp('```json', 'g'), '').replace(new RegExp('```', 'g'), '').trim();
      
      const aiResultJson = JSON.parse(cleanText);

      // FASE 4: TRANSACTION DATABASE
      let assessmentId = "";
      await db.runTransaction(async (transaction) => {
        
        // DEKLARASI WADAH KHUSUS DI DALAM TRANSAKSI AGAR TYPESCRIPT BISA MEMBACANYA
        let finalDocTemplates: string[] = [];

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

          // MENGAMBIL DATA TEMPLATE LANGSUNG DARI DOKUMEN TRANSAKSI
          finalDocTemplates = corpData?.allowedDocumentTemplates || [];

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
          
          // ==========================================
          // INJEKSI SISTEM MONETISASI & TEMPLATE
          // ==========================================
          // Menggunakan variabel scope dalam yang tidak akan terkena error garis merah
          allowedDocumentTemplates: finalDocTemplates, 
          documentGenerationQuota: tokenUsed ? 1 : 0, 
          hasPaidForDocument: false, 
          
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // FASE 4.5: MENGIRIM EMAIL
      const smtpEmail = smtpEmailSecret.value();
      const smtpPassword = smtpPasswordSecret.value();
      const targetEmail = formData.email || userEmail;

      if (smtpEmail && smtpPassword && targetEmail) {
        const assessmentUrl = `https://curation--teknopark-surakarta.asia-southeast1.hosted.app/result/${assessmentId}`;
        
        sendAssessmentEmail(smtpEmail, smtpPassword, {
          targetEmail: targetEmail,
          namaUsaha: formData.namaUsaha || 'Bisnis Anda',
          totalScore: aiResultJson.totalScore,
          readinessLevel: aiResultJson.readinessLevel,
          trackType: trackType,
          assessmentUrl: assessmentUrl
        }).catch(err => console.error("Kegagalan pengiriman email:", err));
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