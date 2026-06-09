// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

admin.initializeApp();
const db = admin.firestore();

// Mendaftarkan Secret Manager untuk API Key
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const processCurationAssessment = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 540, // Batas waktu 9 menit (Aman untuk AI dan File Besar)
    region: "asia-southeast2", // Region server, sesuaikan jika Anda pakai region lain
    secrets: [geminiApiKeySecret], // Mengaitkan secret ke fungsi ini
  },
  async (request) => {
    // 1. Ekstrak Parameter dari Frontend
    const { formData, trackType, aiPromptConfig, aiModelType = 'pro', tokenUsed, storageFilePaths } = request.data;
    
    // Ambil nilai API Key yang aman dari Secret Manager
    const API_KEY = geminiApiKeySecret.value();
    if (!API_KEY) throw new HttpsError("internal", "API Key AI tidak dikonfigurasi di Secret Manager.");

    const fileManager = new GoogleAIFileManager(API_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    let corporateEntityName = null;
    const uploadedGeminiFiles: any[] = [];
    const tempLocalFiles: string[] = [];

    // =========================================================
    // FASE 1: PRE-VALIDASI TOKEN DARI DATABASE
    // =========================================================
    if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
      const [corpId, tokenCode] = tokenUsed.split('-');
      const tokenDoc = await db.collection('corporate_tokens').doc(corpId).get();
      
      if (!tokenDoc.exists) {
        throw new HttpsError("not-found", "Entitas korporat tidak ditemukan.");
      }
      
      const tokenData = tokenDoc.data();
      if (!tokenData?.tokens?.[tokenCode] || tokenData.tokens[tokenCode].isUsed) {
        throw new HttpsError("permission-denied", "Token tidak valid atau sudah pernah digunakan.");
      }
      corporateEntityName = tokenData.corporateName;
    }

    try {
      const parts: any[] = [];
      const bucket = admin.storage().bucket(); 
      
      // =========================================================
      // FASE 2: INTERNAL FILE TRANSFER (Zero Double-Hop)
      // =========================================================
      if (storageFilePaths && storageFilePaths.length > 0) {
        for (const filePath of storageFilePaths) {
          const fileName = path.basename(filePath);
          const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
          
          // Download super-cepat dari Cloud Storage ke Memori Function
          await bucket.file(filePath).download({ destination: tempFilePath });
          tempLocalFiles.push(tempFilePath);
          
          const [metadata] = await bucket.file(filePath).getMetadata();
          const mimeType = metadata.contentType || 'application/pdf';

          // Upload ke server Google AI
          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType,
            displayName: "Dokumen Lampiran Asesmen"
          });
          
          uploadedGeminiFiles.push(uploadResult.file);
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
        }
      }

      // =========================================================
      // FASE 3: PERSIAPAN PROMPT & SKEMA JSON
      // =========================================================
      const isPro = aiModelType === 'pro';
      const selectedModelName = isPro ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      
      const textData: Record<string, any> = {};
      for (const key in formData) {
        const val = formData[key];
        // Jangan sertakan URL panjang ke prompt text
        if (typeof val !== 'string' || !val.startsWith('http')) {
          if (val !== null && val !== undefined && val !== '') {
            const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
            textData[readableKey] = val;
          }
        }
      }

      const dataString = Object.entries(textData)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");

      const trackContext = trackType || "Evaluasi Umum";
      const aiPersona = aiPromptConfig?.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA";
      const assessmentGoal = aiPromptConfig?.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat, menganalisis potensi, dan memberikan rekomendasi strategis.";

      const targetAnalysisBlocks = aiPromptConfig?.expectedAnalysisBlocks && aiPromptConfig.expectedAnalysisBlocks.length > 0
        ? aiPromptConfig.expectedAnalysisBlocks.map((block: string) => `- ${block}`).join("\n")
        : "- Posisi Pasar\n- Kesehatan Finansial\n- Kapabilitas Tim";

      const targetMetrics = aiPromptConfig?.expectedMetrics && aiPromptConfig.expectedMetrics.length > 0
        ? aiPromptConfig.expectedMetrics
        : ["Kualitas & Inovasi", "Validasi Pasar", "Kesehatan Finansial", "Kapabilitas Tim", "Skalabilitas", "Legalitas / Kepatuhan"];

      const promptText = `
ANDA ADALAH: ${aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${trackContext}".
Tujuan Utama Analisis: ${assessmentGoal}

DATA TEKS FORM:
${dataString}

${storageFilePaths && storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Buat ringkasan padat tentang entitas ini sesuai tujuan asesmen.
2. FILE ANALYSIS: Nilai validitas dokumen. Catat jika ada ketidaksesuaian (Discrepancies).
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut. Pastikan Anda menjabarkan nilai indikator (label) secara mendetail:
${targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${targetMetrics.join(", ")}].
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan.
6. ACTION PLAN: Buat rekomendasi dengan Timeframe spesifik.
7. SCORING: Berikan "totalScore" (0-100) dan "readinessLevel". Tentukan "incubationRoute" (Rute rekomendasi selanjutnya).

ATURAN WAJIB:
- Output MURNI dalam format JSON.
- SELURUH TEKS JAWABAN WAJIB MENGGUNAKAN BAHASA INDONESIA.
`;

      parts.unshift({ text: promptText });

      const systemPrompt = isPro 
        ? "Anda adalah AI Evaluator Premium. Analisis mendalam, kritis, deteksi celah logika, dan berikan strategi level mahir. Format output hanya JSON berbahasa Indonesia."
        : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat berdasarkan fakta. Format output hanya JSON berbahasa Indonesia.";

      const model = genAI.getGenerativeModel({
        model: selectedModelName,
        systemInstruction: systemPrompt,
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
                        properties: {
                          label: { type: SchemaType.STRING },
                          value: { type: SchemaType.STRING }
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
                  documentQuality: { type: SchemaType.STRING },
                  keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  discrepancies: { type: SchemaType.STRING }
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
                    description: { type: SchemaType.STRING }
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

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResultJson = JSON.parse(cleanText);

      // =========================================================
      // FASE 4: DATABASE TRANSACTION (ACID)
      // =========================================================
      let assessmentId = "";
      
      await db.runTransaction(async (transaction) => {
        let tokenRef;
        let tokenCode = "";
        
        // Cek ulanh token tepat sebelum menyimpan untuk cegah Race-Condition
        if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
          const split = tokenUsed.split('-');
          tokenRef = db.collection('corporate_tokens').doc(split[0]);
          tokenCode = split[1];
          
          const tDoc = await transaction.get(tokenRef);
          if (!tDoc.exists || tDoc.data()?.tokens?.[tokenCode]?.isUsed) {
            throw new Error("Token telah digunakan secara paralel oleh pihak lain. Transaksi dibatalkan.");
          }
        }

        const newAssessmentRef = db.collection("assessments").doc();
        assessmentId = newAssessmentRef.id;
        
        transaction.set(newAssessmentRef, {
          trackType: trackType,
          corporateEntity: corporateEntityName, 
          namaUsaha: formData.namaUsaha || 'Tanpa Nama',
          email: formData.email || '',
          whatsapp: formData.whatsapp || '',
          score: aiResultJson.totalScore || 0,
          readinessLevel: aiResultJson.readinessLevel || 'Belum Ditentukan',
          formData: formData,
          aiResult: aiResultJson,
          tokenUsed: tokenUsed || null, 
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (tokenRef && tokenCode) {
          transaction.update(tokenRef, {
            [`tokens.${tokenCode}.isUsed`]: true,
            [`tokens.${tokenCode}.usedAt`]: admin.firestore.FieldValue.serverTimestamp(),
            [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
            usedCount: admin.firestore.FieldValue.increment(1)
          });
        }
      });

      return { assessmentId, aiResult: aiResultJson };

    } catch (error: any) {
      console.error("Cloud Function Error:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI atau format tidak sesuai.");
    } finally {
      // =========================================================
      // FASE 5: GARBAGE COLLECTION
      // =========================================================
      for (const tmpFile of tempLocalFiles) {
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
      }
      for (const geminiFile of uploadedGeminiFiles) {
        try { await fileManager.deleteFile(geminiFile.name); } catch (e) {}
      }
    }
  }
);