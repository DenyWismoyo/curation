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

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const processCurationAssessment = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: [
      "https://curation--teknopark-surakarta.asia-southeast1.hosted.app",
      "http://localhost:3000"
    ],
  },
  async (request) => {
    const data = request.data as any;
    if (!data) {
      throw new HttpsError("invalid-argument", "Data request kosong atau tidak valid.");
    }

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

    // =========================================================
    // FASE 1: PRE-VALIDASI TOKEN DARI SUB-COLLECTION (FIXED GHOST DOCUMENT)
    // =========================================================
    if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
      const lastDashIndex = tokenUsed.lastIndexOf('-');
      // Menambahkan trim() untuk berjaga-jaga jika ada spasi tersembunyi
      const corpId = tokenUsed.substring(0, lastDashIndex).trim();
      const tokenCode = tokenUsed.substring(lastDashIndex + 1).trim();
      
      if (!corpId || !tokenCode) {
        throw new HttpsError("invalid-argument", "Format token tidak valid.");
      }

      const corpRef = db.collection('corporate_tokens').doc(corpId);
      const tokenRef = corpRef.collection('tokens').doc(tokenCode);
      
      // 1. Langsung tembak ke Sub-Collection Token, abaikan eksistensi dokumen induk
      const tokenDoc = await tokenRef.get();

      if (!tokenDoc.exists) {
        throw new HttpsError("not-found", `Kode token ${tokenCode} tidak ditemukan di entitas ${corpId}.`);
      }

      const tokenData = tokenDoc.data();
      if (tokenData?.isUsed) {
        throw new HttpsError("permission-denied", "Token ini sudah pernah digunakan.");
      }

      // 2. Coba ambil nama korporat jika dokumen induknya nyata (bukan ghost document)
      const corpDoc = await corpRef.get();
      corporateEntityName = corpDoc.exists ? (corpDoc.data()?.corporateName || corpId) : corpId;
    }

    try {
      const parts: any[] = [];
      const bucket = admin.storage().bucket(); 
      
      // =========================================================
      // FASE 2: INTERNAL FILE TRANSFER
      // =========================================================
      if (storageFilePaths && storageFilePaths.length > 0) {
        for (const filePath of storageFilePaths) {
          const fileName = path.basename(filePath);
          const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
          
          await bucket.file(filePath).download({ destination: tempFilePath });
          tempLocalFiles.push(tempFilePath);
          
          const [metadata] = await bucket.file(filePath).getMetadata();
          const mimeType = metadata.contentType || 'application/pdf';

          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType,
            displayName: "Dokumen Lampiran Asesmen"
          });
          
          uploadedGeminiFiles.push(uploadResult.file);
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
        }
      }

      // =========================================================
      // FASE 3: PERSIAPAN DATA PROMPT
      // =========================================================
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

      const dataString = Object.entries(textData)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");

      const trackContext = trackType;
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
      // FASE 4: TRANSACTION DATABASE SECURE AMAN (ACID)
      // =========================================================
      let assessmentId = "";
      await db.runTransaction(async (transaction) => {
        
        if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
          const lastDashIndex = tokenUsed.lastIndexOf('-');
          const corpId = tokenUsed.substring(0, lastDashIndex).trim();
          const tokenCode = tokenUsed.substring(lastDashIndex + 1).trim();
          
          const corpRefToUpdate = db.collection('corporate_tokens').doc(corpId);
          const tokenRefToUpdate = corpRefToUpdate.collection('tokens').doc(tokenCode);
          
          const tDoc = await transaction.get(tokenRefToUpdate);
          
          if (!tDoc.exists) {
            throw new Error(`Token ${tokenCode} tidak ditemukan di entitas ${corpId}`);
          }

          const tokenData = tDoc.data();
          if (tokenData?.isUsed) {
            throw new Error("Token telah digunakan secara paralel oleh pihak lain. Transaksi dibatalkan.");
          }

          // Update status di dokumen token sub-collection
          transaction.update(tokenRefToUpdate, {
            isUsed: true,
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            usedByNamaUsaha: formData.namaUsaha || 'Tanpa Nama',
          });

          // Menggunakan SET dengan { merge: true } untuk mengatasi Ghost Document
          // Jika dokumen IBTPRO belum nyata, akan dibuatkan otomatis.
          transaction.set(corpRefToUpdate, {
            usedCount: admin.firestore.FieldValue.increment(1)
          }, { merge: true });
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