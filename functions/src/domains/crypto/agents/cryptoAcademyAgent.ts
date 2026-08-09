import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";

const getDb = () => getFirestore(admin.app(), "curation");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

// Definisikan XP calculation sesuai rencana
const calculateXP = (
  score: number, 
  difficulty: "beginner" | "intermediate" | "advanced" | "expert",
  isFirstAttempt: boolean
): number => {
  const basePts = { beginner: 10, intermediate: 20, advanced: 35, expert: 50 };
  const base = basePts[difficulty] || 10;
  const scoreBonus = Math.floor((score / 100) * base);
  const firstBonus = isFirstAttempt ? 5 : 0;
  return base + scoreBonus + firstBonus;
};

export const saveCryptoQuizResult = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login untuk menyimpan hasil kuis.");
  }

  const uid = request.auth.uid;
  const data = request.data || {};
  const { moduleId, score, quizResultId, passed, timeSpentSeconds } = data;

  if (!moduleId || typeof score !== 'number') {
    throw new HttpsError("invalid-argument", "Data moduleId dan score harus disertakan.");
  }

  const db = getDb();
  
  // Ambil data modul untuk mendapatkan level dan difficulty
  const moduleSnap = await db.collection("cryptoEducation").doc(moduleId).get();
  if (!moduleSnap.exists) {
    throw new HttpsError("not-found", "Modul tidak ditemukan.");
  }
  
  const moduleData = moduleSnap.data()!;
  const level = moduleData.level || "Uncategorized";
  const difficulty = moduleData.difficulty || "beginner";

  // Ambil progress modul yang sudah ada (untuk mengecek apakah ini percobaan pertama)
  const progressRef = db.collection("userProgress").doc(uid).collection("modules").doc(moduleId);
  const progressSnap = await progressRef.get();
  
  const isFirstAttempt = !progressSnap.exists || !progressSnap.data()?.completed;
  const previousAttempts = progressSnap.exists ? (progressSnap.data()?.quizAttempts || 0) : 0;
  
  // Hanya tambah XP jika lulus dan ini first attempt atau perbaikan score belum diimplementasikan untuk farming
  // Kita tambahkan XP tiap kali kuis dikerjakan? Sebaiknya XP penuh hanya untuk percobaan pertama lulus, 
  // tapi untuk saat ini ikuti rumus:
  let xpEarned = 0;
  if (passed) {
    xpEarned = calculateXP(score, difficulty, isFirstAttempt);
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // 1. Simpan progress modul
  batch.set(progressRef, {
    completed: passed || (progressSnap.exists ? progressSnap.data()?.completed : false),
    completedAt: passed ? now : (progressSnap.exists ? progressSnap.data()?.completedAt : null),
    level: level,
    score: score,
    quizAttempts: previousAttempts + 1,
    lastQuizResultId: quizResultId || null,
    timeSpentSeconds: timeSpentSeconds || 0,
    startedAt: progressSnap.exists ? progressSnap.data()?.startedAt : now,
    lastUpdated: now,
  }, { merge: true });

  // 2. Update stats di userAcademyStats
  const statsRef = db.collection("userAcademyStats").doc(uid);
  const statsSnap = await statsRef.get();
  
  let newBadges: string[] = [];

  if (!statsSnap.exists) {
    batch.set(statsRef, {
      userId: uid,
      totalScore: score,
      averageScore: score,
      completedModules: passed ? 1 : 0,
      completedLevels: [],
      currentLevel: level,
      streak: 1,
      lastActiveAt: now,
      xp: xpEarned,
      badges: [],
      updatedAt: now,
    });
  } else {
    const statsData = statsSnap.data()!;
    const completedModules = passed && isFirstAttempt ? (statsData.completedModules || 0) + 1 : (statsData.completedModules || 0);
    const totalScore = (statsData.totalScore || 0) + (isFirstAttempt ? score : 0); // Simplifikasi averagenya
    
    // Streak logic: check if lastActiveAt was yesterday
    let streak = statsData.streak || 0;
    if (statsData.lastActiveAt) {
      const lastActiveDate = statsData.lastActiveAt.toDate();
      const today = new Date();
      
      const lastActiveDay = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate()).getTime();
      const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      
      const diffDays = Math.round((currentDay - lastActiveDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1; // reset
      }
    } else {
      streak = 1;
    }

    batch.update(statsRef, {
      totalScore: totalScore,
      averageScore: completedModules > 0 ? Math.round(totalScore / completedModules) : 0,
      completedModules: completedModules,
      currentLevel: level,
      streak: streak,
      lastActiveAt: now,
      xp: admin.firestore.FieldValue.increment(xpEarned),
      updatedAt: now,
    });
    
    // Badge assignment logic
    let bonusXp = 0;
    
    if (streak >= 7 && !(statsData.badges || []).includes("Streak 7")) {
      newBadges.push("Streak 7");
      bonusXp += 30;
    }
    
    if (score === 100 && passed && !(statsData.badges || []).includes("Perfectionist")) {
      newBadges.push("Perfectionist");
      bonusXp += 40;
    }
    
    if (score >= 90 && passed && (moduleData.tags || []).some((t: string) => t.toLowerCase().includes('chart') || t.toLowerCase().includes('candlestick'))) {
      if (!(statsData.badges || []).includes("Chart Reader")) {
        newBadges.push("Chart Reader");
        bonusXp += 25;
      }
    }

    if (newBadges.length > 0) {
      batch.update(statsRef, {
        badges: admin.firestore.FieldValue.arrayUnion(...newBadges),
        xp: admin.firestore.FieldValue.increment(bonusXp),
      });
      xpEarned += bonusXp;
    }
  }

  await batch.commit();

  if (passed && isFirstAttempt) {
    // Post-commit checks for complex badges & levels
    const statsSnapPost = await statsRef.get();
    const statsDataPost = statsSnapPost.data() || {};
    let postBadges: string[] = [];
    let postBonusXp = 0;
    
    // Check Speed Learner
    if (!(statsDataPost.badges || []).includes("Speed Learner")) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentProgressSnap = await db.collection("userProgress").doc(uid).collection("modules")
        .where("completed", "==", true)
        .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(yesterday))
        .get();
        
      if (recentProgressSnap.size >= 3) {
        postBadges.push("Speed Learner");
        postBonusXp += 50;
      }
    }
    
    // Check Completed Levels
    const levelModulesSnap = await db.collection("cryptoEducation").where("level", "==", level).get();
    const totalLevelModules = levelModulesSnap.size;
    
    const userLevelProgressSnap = await db.collection("userProgress").doc(uid).collection("modules")
      .where("level", "==", level)
      .where("completed", "==", true)
      .get();
    const userCompletedLevelModules = userLevelProgressSnap.size;
    
    if (totalLevelModules > 0 && userCompletedLevelModules >= totalLevelModules) {
      // Level completed!
      if (!(statsDataPost.completedLevels || []).includes(level)) {
        await statsRef.update({
          completedLevels: admin.firestore.FieldValue.arrayUnion(level)
        });
        
        if (level === "Pemula (Crypto 101)" && !(statsDataPost.badges || []).includes("Crypto 101")) {
          postBadges.push("Crypto 101");
          postBonusXp += 100;
        }
        
        if (level === "Lanjutan (Smart Money Concepts)" && !(statsDataPost.badges || []).includes("SMC Master")) {
          postBadges.push("SMC Master");
          postBonusXp += 150;
        }
      }
    }
    
    if (postBadges.length > 0) {
      await statsRef.update({
        badges: admin.firestore.FieldValue.arrayUnion(...postBadges),
        xp: admin.firestore.FieldValue.increment(postBonusXp),
      });
      newBadges.push(...postBadges);
      xpEarned += postBonusXp;
    }
  }

  return { 
    success: true, 
    xpEarned,
    newBadges,
    passed
  };
});

export const refactorCryptoModuleWithStudyData = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }
  
  const { moduleId } = request.data || {};
  if (!moduleId) {
    throw new HttpsError("invalid-argument", "Data moduleId harus disertakan.");
  }

  const db = getDb();
  const moduleRef = db.collection("cryptoEducation").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  
  if (!moduleSnap.exists) {
    throw new HttpsError("not-found", "Modul tidak ditemukan.");
  }
  
  // Ubah status dokumen agar trigger pipeline berjalan
  await moduleRef.update({
    refactorStatus: "INDEXING_RESEARCH",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, async: true, message: "Pipeline Refactoring Asinkron Dimulai" };
});

export const enrichCryptoModuleMetadata = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const { moduleId } = request.data || {};
  if (!moduleId) {
    throw new HttpsError("invalid-argument", "Data moduleId harus disertakan.");
  }

  const db = getDb();
  const moduleRef = db.collection("cryptoEducation").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  
  if (!moduleSnap.exists) {
    throw new HttpsError("not-found", "Modul tidak ditemukan.");
  }
  
  const moduleData = moduleSnap.data()!;
  const content = moduleData.content || "";
  
  if (content.length < 50) {
    throw new HttpsError("failed-precondition", "Konten terlalu pendek untuk dianalisis.");
  }

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `Anda adalah asisten AI yang ahli dalam kripto dan edukasi.
Tugas Anda adalah mengekstrak metadata penting dari konten modul materi Crypto Academy berikut.

KONTEN MODUL:
"""
${content.substring(0, 30000)}
"""

Instruksi Ekstraksi:
1. description: Berikan ringkasan materi dalam 1-2 kalimat pendek (maksimal 150 karakter) yang menarik.
2. keyLearnings: Berikan maksimal 5 poin pembelajaran utama dari konten tersebut (singkat dan padat).
3. tags: Berikan 3-5 tag/kata kunci yang relevan (misal: "blockchain", "trading", "RSI").
4. difficulty: Tentukan tingkat kesulitan modul ini. Pilih HANYA SATU dari: "beginner", "intermediate", "advanced", atau "expert".
5. estimatedMinutes: Berapa estimasi menit yang dibutuhkan orang awam untuk membaca dan memahami teks di atas.

Keluarkan hasil HANYA dalam format JSON dengan skema berikut tanpa backtick markdown:
{
  "description": "string",
  "keyLearnings": ["string"],
  "tags": ["string"],
  "difficulty": "beginner | intermediate | advanced | expert",
  "estimatedMinutes": number
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            description: { type: SchemaType.STRING },
            keyLearnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            difficulty: { type: SchemaType.STRING },
            estimatedMinutes: { type: SchemaType.NUMBER },
          },
          required: ["description", "keyLearnings", "tags", "difficulty", "estimatedMinutes"]
        }
      }
    });

    const responseText = result.response.text();
    const metadata = JSON.parse(responseText);

    await moduleRef.update({
      description: metadata.description || moduleData.description,
      keyLearnings: metadata.keyLearnings || moduleData.keyLearnings,
      tags: metadata.tags || moduleData.tags,
      difficulty: metadata.difficulty || moduleData.difficulty,
      estimatedMinutes: metadata.estimatedMinutes || moduleData.estimatedMinutes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, metadata };
  } catch (error: any) {
    console.error("Error in enrichCryptoModuleMetadata:", error);
    throw new HttpsError("internal", `Gagal memproses metadata dengan AI: ${error.message}`);
  }
});

export const generateCryptoModuleAssessment = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  secrets: [geminiApiKeySecret],
  timeoutSeconds: 300,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const { moduleId } = request.data || {};
  if (!moduleId) {
    throw new HttpsError("invalid-argument", "Data moduleId harus disertakan.");
  }

  const db = getDb();
  const moduleRef = db.collection("cryptoEducation").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  
  if (!moduleSnap.exists) {
    throw new HttpsError("not-found", "Modul tidak ditemukan.");
  }
  
  const moduleData = moduleSnap.data()!;
  const content = moduleData.content || "";
  const studyProjectId = moduleData.studyProjectId;
  
  let studyContext = "";
  if (studyProjectId) {
     const sourcesSnap = await db.collection("study_projects").doc(studyProjectId).collection("sources").limit(5).get();
     const summaries = sourcesSnap.docs.map(d => d.data().summaryHint || d.data().extractedText?.substring(0, 500) || "").filter(Boolean);
     if (summaries.length > 0) {
        studyContext = summaries.join("\n\n");
     }
  }
  
  if (content.length < 50) {
    throw new HttpsError("failed-precondition", "Konten terlalu pendek untuk dianalisis.");
  }

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `Anda adalah seorang instruktur/assessor ahli dalam materi kripto.
Tugas Anda adalah membuat soal-soal kuis pilihan ganda yang interaktif dan berkualitas tinggi berdasarkan KONTEN MODUL yang diberikan.
Soal harus menguji pemahaman konsep secara mendalam, bukan sekadar hafalan. 
Berikan penjelasan (explanation) logis mengapa jawaban tersebut benar untuk fitur "review".

KONTEN MODUL:
"""
${content.substring(0, 30000)}
"""

${studyContext ? `FAKTA TAMBAHAN DARI SUMBER KAJIAN (Sebagai referensi pembuatan soal yang lebih berbobot):\n"""\n${studyContext.substring(0, 10000)}\n"""` : ''}

INSTRUKSI:
1. Buat persis 5 buah pertanyaan.
2. Setiap pertanyaan memiliki 4 pilihan ganda (A, B, C, D).
3. Hasilkan output HANYA dalam format JSON array of objects tanpa pembungkus markdown apapun.

SKEMA JSON (Array of Step Objects yang kompatibel dengan sistem FormTemplate):
[
  {
    "id": "step_1",
    "title": "Pertanyaan 1",
    "description": "Teks pertanyaan 1?",
    "logicType": "all",
    "fields": [
      {
        "id": "q1",
        "type": "radio",
        "label": "Teks pertanyaan (bisa disamakan dengan description)",
        "required": true,
        "options": [
          { "label": "Pilihan A", "value": "a" },
          { "label": "Pilihan B", "value": "b" },
          { "label": "Pilihan C", "value": "c" },
          { "label": "Pilihan D", "value": "d" }
        ],
        "validationRules": {
          "correctAnswer": "a", 
          "points": 20,
          "explanation": "Penjelasan mengapa opsi A benar."
        }
      }
    ]
  }
]
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    let steps: any[] = [];
    try {
      steps = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Gagal parsing JSON dari respons AI.");
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("AI mengembalikan struktur yang salah.");
    }

    const templateRef = db.collection("assessmentTemplates").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const templateData = {
      title: `Kuis: ${moduleData.title}`,
      description: `Kuis evaluasi untuk modul ${moduleData.title}`,
      authorUid: request.auth.uid,
      category: "crypto_academy",
      tags: moduleData.tags || ["kuis", "crypto"],
      formMode: "standard",
      passingScore: 70,
      createdAt: now,
      updatedAt: now,
      published: true,
      cryptoModuleId: moduleId,
      assessmentPurpose: "crypto_module_quiz",
      steps: steps.map((step: any, idx: number) => ({
        ...step,
        id: `quiz_step_${idx + 1}`
      }))
    };

    await templateRef.set(templateData);

    await moduleRef.update({
      assessmentTemplateId: templateRef.id,
      updatedAt: now,
    });

    return { 
      success: true, 
      templateId: templateRef.id,
      questionsCount: steps.length
    };
  } catch (error: any) {
    console.error("Error in generateCryptoModuleAssessment:", error);
    throw new HttpsError("internal", `Gagal memproses pembuatan kuis dengan AI: ${error.message}`);
  }
});
