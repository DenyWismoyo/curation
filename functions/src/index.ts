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

admin.initializeApp();

// Menggunakan database "curation" secara eksplisit agar selaras dengan Frontend
const db = getFirestore(admin.app(), "curation");

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
    // =========================================================
    // FASE 0: VALIDASI AUTENTIKASI (GOOGLE LOGIN)
    // =========================================================
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", 
        "Akses ditolak. Pengguna harus login menggunakan akun Google untuk memproses asesmen."
      );
    }
    const userId = request.auth.uid; 
    const userEmail = request.auth.token.email || '';

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
    // FASE 1: PRE-VALIDASI TOKEN (MENCEGAH PENGGUNAAN GANDA)
    // =========================================================
    if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
      const lastDashIndex = tokenUsed.lastIndexOf('-');
      const rawCorpId = tokenUsed.substring(0, lastDashIndex);
      const rawTokenCode = tokenUsed.substring(lastDashIndex + 1);
      
      const corpId = rawCorpId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const tokenCode = rawTokenCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      if (!corpId || !tokenCode) {
        throw new HttpsError("invalid-argument", "Format token tidak valid setelah sanitasi.");
      }

      const corpRef = db.collection('corporate_tokens').doc(corpId);
      const corpDoc = await corpRef.get();

      if (!corpDoc.exists) {
        throw new HttpsError("not-found", `Entitas korporat ${corpId} tidak ditemukan.`);
      }

      const corpData = corpDoc.data();
      const tokensMap = corpData?.tokens || {};
      const tokenData = tokensMap[tokenCode];

      if (!tokenData) {
        throw new HttpsError("not-found", `Kode token ${tokenCode} tidak ditemukan di entitas ${corpId}.`);
      }

      if (tokenData.isUsed) {
        throw new HttpsError("permission-denied", "Token ini sudah pernah digunakan.");
      }

      corporateEntityName = corpData?.corporateName || corpId;
    }

    try {
      const parts: any[] = [];
      const bucket = admin.storage().bucket(); 
      
      // =========================================================
      // FASE 2: INTERNAL FILE TRANSFER (GCS TO GEMINI) & POLLING
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
          
          // MEKANISME POLLING: Menunggu pemrosesan internal Google AI File Manager (Sangat krusial untuk file Video dan Audio)
          let fileState = await fileManager.getFile(uploadResult.file.name);
          while (fileState.state === "PROCESSING") {
            // Berikan jeda waktu 5 detik sebelum mengecek ulang status file
            await new Promise((resolve) => setTimeout(resolve, 5000));
            fileState = await fileManager.getFile(uploadResult.file.name);
          }
          
          if (fileState.state === "FAILED") {
            throw new Error(`Pemrosesan file media ${fileName} oleh Google AI File Manager gagal.`);
          }

          uploadedGeminiFiles.push(uploadResult.file);
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
        }
      }

      // =========================================================
      // FASE 3: PERSIAPAN PROMPT DINAMIS & ENTERPRISE RULES
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

      // --- EKSTRAKSI ATURAN ENTERPRISE DARI ADMIN ---
      const trackContext = trackType;
      const aiPersona = aiPromptConfig?.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA";
      const assessmentGoal = aiPromptConfig?.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat, menganalisis potensi, dan memberikan rekomendasi strategis.";

      // 1. Grading Strictness
      const strictness = aiPromptConfig?.gradingStrictness || 'standard';
      let strictnessInstruction = "Lakukan penilaian secara objektif dan berimbang sesuai standar industri.";
      if (strictness === 'strict') strictnessInstruction = "Lakukan penilaian SANGAT KETAT selevel audit Venture Capital. Bersikaplah skeptis, cari celah fatal, dan jangan ragu memberikan skor rendah (di bawah 50) jika bukti tidak solid.";
      if (strictness === 'supportive') strictnessInstruction = "Lakukan penilaian yang suportif dan edukatif. Apresiasi usaha, berikan skor yang memotivasi, dan fokus pada potensi perbaikan.";

      // 2. Report Tone
      const tone = aiPromptConfig?.reportTone || 'consultative';
      let toneInstruction = "Gaya bahasa: Konsultatif & Solutif (seperti mentor yang membimbing).";
      if (tone === 'investigative') toneInstruction = "Gaya bahasa: Investigatif & Analitis (tajam, kritis, langsung pada intinya, tanpa basa-basi).";
      if (tone === 'academic') toneInstruction = "Gaya bahasa: Akademis Formal (objektif, terstruktur, berbasis data dan argumen logis).";

      // 3. Readiness Tiers
      const customTiers = aiPromptConfig?.customReadinessTiers || [];
      const tiersString = customTiers.length > 0 
        ? customTiers.map((t: string) => `"${t}"`).join(', ') 
        : '"Pra-Inkubasi", "Siap Akselerasi", "Lulus Investasi"';

      // 4. Risk Framework
      const riskFramework = aiPromptConfig?.riskFramework || '';
      const riskInstruction = riskFramework ? `FOKUS IDENTIFIKASI RISIKO WAJIB: ${riskFramework}` : "Identifikasi risiko operasional, finansial, dan pasar secara umum.";

      // --- EKSTRAKSI BLOK METRIK ---
      const targetAnalysisBlocks = aiPromptConfig?.expectedAnalysisBlocks && aiPromptConfig.expectedAnalysisBlocks.length > 0
        ? aiPromptConfig.expectedAnalysisBlocks.map((block: string) => `- ${block}`).join("\n")
        : "- Posisi Pasar (Fokus Indikator: Niche Pasar, Keunggulan)\n- Kesehatan Finansial (Fokus Indikator: Pendapatan, Runway)\n- Kapabilitas Tim (Fokus Indikator: Keahlian, Hambatan)";

      const targetMetrics = aiPromptConfig?.expectedMetrics && aiPromptConfig.expectedMetrics.length > 0
        ? aiPromptConfig.expectedMetrics
        : ["Kualitas & Inovasi", "Validasi Pasar", "Kesehatan Finansial / Pendanaan", "Kapabilitas Tim", "Skalabilitas", "Legalitas / Kepatuhan"];

      const promptText = `
ANDA ADALAH: ${aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${trackContext}".

TUJUAN UTAMA: ${assessmentGoal}
ATURAN PENILAIAN (SKOR): ${strictnessInstruction}
ATURAN GAYA BAHASA: ${toneInstruction}

DATA TEKS FORM:
${dataString}

${storageFilePaths && storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM BERTAUTAN MULTIMEDIA TERSEBUT." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Buat ringkasan padat tentang entitas ini sesuai tujuan asesmen. Manfaatkan data web penelusuran (search grounding) untuk memvalidasi tren industri, keunikan produk, serta kompetitor utama yang sejenis secara relevan.
2. FILE ANALYSIS: Nilai validitas dokumen ataupun lampiran media (video/audio/gambar). Catat jika ada ketidaksesuaian (Discrepancies) dengan isi formulir.
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut. Pastikan Anda menjabarkan nilai indikator (label) secara mendetail:
${targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${targetMetrics.join(", ")}].
   -> Deskripsi alasan skor WAJIB spesifik.
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan. ${riskInstruction}
6. ACTION PLAN: Buat rekomendasi dengan Timeframe spesifik.
7. SCORING & TIERING: 
   - Berikan "totalScore" (0-100) sesuai aturan penilaian di atas.
   - Penentuan "readinessLevel" WAJIB memilih HANYA DARI SALAH SATU STATUS BERIKUT: [${tiersString}]. Jika tidak ada yang cocok, pilih yang paling mendekati.
   - Tentukan "incubationRoute" (Rute rekomendasi selanjutnya).

ATURAN MULTLAK:
- Output MURNI dalam format JSON.
- SELURUH TEKS JAWABAN WAJIB MENGGUNAKAN BAHASA INDONESIA.
`;

      parts.unshift({ text: promptText });

      const systemPrompt = isPro 
        ? "Anda adalah AI Evaluator Premium. Analisis mendalam, kritis, deteksi celah logika, manfaatkan penelusuran web search grounding untuk memvalidasi keabsahan data entitas secara real-time, dan patuhi instruksi format secara absolut. Format output hanya JSON berbahasa Indonesia."
        : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, akurat berdasarkan fakta, dan optimalkan pencarian search grounding demi validitas info. Format output hanya JSON berbahasa Indonesia.";

      const model = genAI.getGenerativeModel({
        model: selectedModelName,
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }], // MENGAKTIFKAN ENTERPRISE GOOGLE SEARCH GROUNDING
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["readinessLevel", "totalScore", "incubationRoute", "executiveSummary", "customAnalysisBlocks", "fileAnalysisInsights", "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"],
            properties: {
              executiveSummary: { type: SchemaType.STRING },
              readinessLevel: { 
                type: SchemaType.STRING, 
                description: `WAJIB pilih salah satu persis dari daftar ini: [${tiersString}]` 
              },
              totalScore: { type: SchemaType.INTEGER },
              incubationRoute: { type: SchemaType.STRING },
              customAnalysisBlocks: {
                type: SchemaType.ARRAY,
                description: "Blok analisis dinamis menyesuaikan ekspektasi yang diwajibkan",
                items: {
                  type: SchemaType.OBJECT,
                  required: ["title", "iconType", "metrics"],
                  properties: {
                    title: { type: SchemaType.STRING, description: "Judul analitik sesuai blueprint, misal: 'Potensi Pasar', 'Kesehatan Finansial'" },
                    iconType: { type: SchemaType.STRING, description: "Pilih salah satu string ini yang paling cocok: 'finance', 'target', 'users', 'idea', 'document', 'award', 'shield'" },
                    metrics: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          label: { type: SchemaType.STRING, description: "Indikator spesifik sesuai fokus, misal: 'Target Niche', 'Skalabilitas'" },
                          value: { type: SchemaType.STRING, description: "Penjelasan mendetail dari label tersebut" }
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
                items: { 
                  type: SchemaType.OBJECT, 
                  required: ["title", "content"], 
                  properties: { 
                    title: { type: SchemaType.STRING }, 
                    content: { type: SchemaType.STRING } 
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
          const rawCorpId = tokenUsed.substring(0, lastDashIndex);
          const rawTokenCode = tokenUsed.substring(lastDashIndex + 1);
          
          const corpId = rawCorpId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const tokenCode = rawTokenCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          
          const corpRefToUpdate = db.collection('corporate_tokens').doc(corpId);
          const cDoc = await transaction.get(corpRefToUpdate);
          
          if (!cDoc.exists) {
            throw new Error(`Entitas ${corpId} tidak ditemukan saat memproses transaksi.`);
          }

          const corpData = cDoc.data();
          const currentTokens = corpData?.tokens || {};
          const tData = currentTokens[tokenCode];

          if (!tData) {
            throw new Error(`Token ${tokenCode} tidak ditemukan di entitas ${corpId}.`);
          }

          if (tData.isUsed) {
            throw new Error("Token telah digunakan secara paralel oleh pihak lain. Transaksi dibatalkan.");
          }

          transaction.update(corpRefToUpdate, {
            [`tokens.${tokenCode}.isUsed`]: true,
            [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
            [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
            usedCount: admin.firestore.FieldValue.increment(1)
          });
        }

        const newAssessmentRef = db.collection("assessments").doc();
        assessmentId = newAssessmentRef.id;
        
        // PENTING: MENYIMPAN userId (UID GOOGLE) KE DATABASE
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