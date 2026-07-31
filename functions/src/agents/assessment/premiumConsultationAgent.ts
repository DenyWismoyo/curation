import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const getDb = () => getFirestore(admin.app(), "curation");

export const premiumConsultationChat = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  secrets: [geminiApiKeySecret],
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Harap login untuk mengakses fitur ini.");
  }

  const { assessmentId, message, history = [] } = request.data;
  if (!assessmentId || !message) {
    throw new HttpsError("invalid-argument", "assessmentId dan message wajib diisi.");
  }

  const db = getDb();
  const assessmentRef = db.collection("assessments").doc(assessmentId);
  
  // Ambil data publik asesmen
  const assessmentDoc = await assessmentRef.get();
  if (!assessmentDoc.exists) {
    throw new HttpsError("not-found", "Asesmen tidak ditemukan.");
  }
  
  const assessmentData = assessmentDoc.data() || {};
  
  // Validasi Kepemilikan & Status Pembayaran
  if (assessmentData.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Anda tidak memiliki akses ke asesmen ini.");
  }
  
  if (!assessmentData.hasPaidForPremiumConsultation) {
    throw new HttpsError("permission-denied", "Anda belum membeli akses Konsultasi Premium untuk asesmen ini.");
  }

  // Ambil data internal / rahasia asesmen (jika ada)
  const internalDoc = await assessmentRef.collection("internal").doc("details").get();
  const internalData = internalDoc.exists ? internalDoc.data() : {};

  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Baca aiPromptConfig untuk membangun persona Premium
  // Consultation yang selaras dengan template yang digunakan admin
  // ═══════════════════════════════════════════════════════════════════
  const config = assessmentData.aiPromptConfig || {};
  const aiPersona = config.aiPersona || 'Konsultan Ahli (Domain Expert)';

  const toneInstructionMap: Record<string, string> = {
    'consultative': 'Gunakan gaya konsultatif premium: sangat empatik, berikan 2-3 opsi solusi, dan tutup setiap saran dengan langkah konkret.',
    'investigative': 'Gunakan gaya investigatif: tegas, forensik, ungkap akar masalah secara langsung tanpa basa-basi.',
    'academic': 'Gunakan gaya akademis dan saintifik: sistematis, berbasis data, referensikan standar industri yang relevan.',
  };
  const toneInstruction = toneInstructionMap[config.reportTone || 'consultative'] || toneInstructionMap['consultative'];

  const formPurposeInstruction = config.formPurpose === 'counseling'
    ? 'MODE KONSELING PREMIUM: Anda memberikan konseling intensif berbayar. Gunakan pendekatan terapeutik yang mendalam, empatik, dan transformatif.'
    : config.formPurpose === 'monitoring'
    ? 'MODE MONITORING PREMIUM: Anda memberikan review mendalam atas progres. Identifikasi hambatan tersembunyi dan berikan solusi akseleratif.'
    : config.formPurpose === 'consultation'
    ? 'MODE KONSULTASI PREMIUM: Anda adalah konsultan ahli berbayar. Berikan insight level C-Suite yang sangat tajam dan actionable.'
    : 'MODE ASESMEN PREMIUM: Anda memberikan panduan pasca-asesmen tingkat lanjut yang sangat personal dan mendalam.';

  // Susun Prompt Konteks
  const contextString = `
    IDENTITAS SUBJEK: ${assessmentData.namaUsaha || 'Pengguna'}
    SKOR AKHIR: ${assessmentData.score || assessmentData.aiResult?.totalScore || 0}/100
    LEVEL: ${assessmentData.readinessLevel || 'N/A'}
    
    ANDA ADALAH: ${aiPersona}
    ${formPurposeInstruction}
    GAYA BAHASA: ${toneInstruction}
    
    ANALISIS SWOT:
    ${JSON.stringify(assessmentData.aiResult?.swotAnalysis || {})}
    
    RISIKO KRITIS:
    ${JSON.stringify(assessmentData.aiResult?.riskAssessment?.criticalRisks || [])}
    
    [RAHASIA - PENALARAN INTERNAL AI PENILAI]:
    ${internalData?._internalReasoning || 'Tidak ada catatan internal.'}
    
    [RAHASIA - ANOMALI DATA]:
    ${JSON.stringify(internalData?.contradictionsFound || [])}
    ${config.customSystemPrompt ? `\n    ATURAN KONDISIONAL KHUSUS:\n    ${config.customSystemPrompt}` : ''}
    ${config.negativePrompts ? `\n    PANTANGAN KERAS (DILARANG):\n    ${config.negativePrompts}` : ''}
    
    TUGAS ANDA:
    Anda adalah ${aiPersona} yang sedang memberikan konsultasi privat premium kepada subjek di atas.
    Gunakan data asesmen dan data rahasia di atas untuk memberikan jawaban yang sangat tajam, spesifik, dan actionable.
    Jika relevan, Anda memiliki alat (tool) 'add_to_action_plan' untuk menambahkan langkah konkret ke Rencana Aksi pengguna.
  `;

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  // Definisi Tools
  const addToActionPlanTool: FunctionDeclaration = {
    name: "add_to_action_plan",
    description: "Tambahkan langkah konkret (task) ke Rencana Aksi pengguna. Gunakan ini jika Anda memberikan saran strategis yang harus dieksekusi.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        task: {
          type: SchemaType.STRING,
          description: "Deskripsi tugas spesifik yang harus dilakukan pengguna (maks. 2 kalimat)."
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Perkiraan waktu eksekusi (misal: '1 Minggu', '30 Hari', 'Segera')."
        }
      },
      required: ["task", "timeframe"],
    },
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: contextString,
    tools: [{ functionDeclarations: [addToActionPlanTool] }]
  });

  const chat = model.startChat({
    history: history,
  });

  try {
    const result = await chat.sendMessage(message);
    const response = result.response;
    let replyText = response.text();
    let actionPlanAdded = false;
    let addedTask = null;

    // Periksa apakah model memanggil function
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "add_to_action_plan") {
          const args = call.args as { task: string; timeframe: string };
          
          // Tambahkan ke aiResult.nextActionSteps di Firestore
          const currentSteps = assessmentData.aiResult?.nextActionSteps || [];
          currentSteps.push({
            task: args.task,
            timeframe: args.timeframe,
            source: "Premium Consultation"
          });
          
          await assessmentRef.update({
            "aiResult.nextActionSteps": currentSteps
          });
          
          actionPlanAdded = true;
          addedTask = args.task;
          
          // Reply ke model bahwa function berhasil dieksekusi
          const functionResponse = await chat.sendMessage([{
            functionResponse: {
              name: "add_to_action_plan",
              response: { status: "SUCCESS", message: "Task added to user's Action Plan." }
            }
          }]);
          
          replyText = functionResponse.response.text();
        }
      }
    }

    // Simpan history ke Firestore (User & AI)
    const historyRef = assessmentRef.collection("consultation_history");
    const batch = db.batch();
    
    const userMsgRef = historyRef.doc();
    batch.set(userMsgRef, {
      role: "user",
      parts: [{ text: message }],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const aiMsgRef = historyRef.doc();
    batch.set(aiMsgRef, {
      role: "model",
      parts: [{ text: replyText }],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return {
      success: true,
      reply: replyText,
      actionPlanAdded,
      addedTask
    };

  } catch (error: any) {
    console.error("Premium Consultation Error:", error);
    throw new HttpsError("internal", error.message || "Gagal menghubungi layanan konsultasi premium.");
  }
});
