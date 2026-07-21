// scripts/mass-generate-outputs.mjs
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Muat variabel lingkungan dari .env.local
dotenv.config({ path: '.env.local' });

// ============================================================================
// 1. VALIDASI KREDENSIAL & INISIALISASI
// ============================================================================
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

// Pastikan kredensial Firebase Admin tersedia di .env.local
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error("❌ ERROR: Kredensial Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) tidak lengkap di .env.local");
  process.exit(1);
}

// Inisialisasi Firebase Admin dengan hak akses penuh
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Mengubah string \n menjadi newline aktual (penting untuk Private Key RSA)
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

// Target database "curation" sesuai dengan arsitektur sistem Anda
const db = getFirestore(undefined, "curation");
const genAI = new GoogleGenerativeAI(apiKey);

// ============================================================================
// 2. KONFIGURASI AGEN AI (COPYWRITER)
// ============================================================================
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Menggunakan flash yang cepat & ringan
  systemInstruction: "Anda adalah Copywriter Senior spesialis konversi penjualan (Sales Copy). Tugas Anda merumuskan 4 poin keuntungan (Benefit & Output) yang akan didapatkan user setelah mereka menggunakan modul asesmen ini. Fokus pada hasil akhir: Mitigasi, Rekomendasi, Action Plan, dan Insight Matrix.",
  generationConfig: {
    temperature: 0.7,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["title", "description"],
        properties: {
          title: { type: SchemaType.STRING, description: "Judul output singkat (misal: 'Rencana Aksi Harian', 'Peta Mitigasi Risiko')" },
          description: { type: SchemaType.STRING, description: "Penjelasan copywriting 1 kalimat mengenai manfaat konkret dari output ini." }
        }
      }
    }
  }
});

// ============================================================================
// 3. LOGIKA EKSEKUSI UTAMA
// ============================================================================
async function massGenerateExpectedOutputs() {
  console.log(`\n🚀 Memulai pemindaian Form Templates di database Firestore...\n`);

  try {
    const templatesSnap = await db.collection('form_templates').get();
    const templates = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const tpl of templates) {
      // Skip jika form sudah punya expectedOutputs (minimal 1 data)
      if (tpl.expectedOutputs && tpl.expectedOutputs.length > 0) {
        console.log(`⏩ SKIP: [${tpl.trackName}] sudah memiliki expectedOutputs.`);
        skipCount++;
        continue;
      }

      // Skip jika AI Prompt Config kosong karena AI butuh referensi untuk meracik kata
      if (!tpl.aiPromptConfig || !tpl.aiPromptConfig.expectedRecommendations) {
        console.log(`⚠️ SKIP: [${tpl.trackName}] tidak memiliki aiPromptConfig yang lengkap.`);
        skipCount++;
        continue;
      }

      console.log(`⏳ MEMPROSES: Sedang men-generate output untuk [${tpl.trackName}]...`);

      const prompt = `
        Konteks Modul: "${tpl.trackName}"
        Deskripsi: "${tpl.trackDescription || 'Asesmen komprehensif'}"
        
        Kerangka yang akan dianalisis AI:
        - Metrik yang dinilai: ${JSON.stringify(tpl.aiPromptConfig.expectedMetrics)}
        - Fokus Risiko: ${tpl.aiPromptConfig.riskFramework || 'Risiko sistemik umum'}
        - Target Rekomendasi: ${JSON.stringify(tpl.aiPromptConfig.expectedRecommendations)}

        Buatlah TEPAT 4 poin benefit output yang memikat dalam bahasa Indonesia.
      `;

      try {
        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();
        
        // Membersihkan format markdown bawaan Gemini jika ada
        if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
        }

        const sellingPoints = JSON.parse(rawText);
        const formattedOutputs = sellingPoints.map(sp => `${sp.title}: ${sp.description}`);

        // Update langsung dokumen di Firestore
        await db.collection('form_templates').doc(tpl.id).update({
          expectedOutputs: formattedOutputs,
          lastUpdated: new Date().toISOString()
        });

        console.log(`✅ SUKSES: Berhasil menyimpan output untuk [${tpl.trackName}]`);
        successCount++;

        // Jeda 3 detik untuk mencegah Rate Limit API dari Google Gemini
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (aiError) {
        console.error(`❌ GAGAL: Error saat memproses [${tpl.trackName}] ->`, aiError.message);
        failCount++;
      }
    }

    console.log(`\n🎉 PROSES SELESAI!`);
    console.log(`📊 RINGKASAN:`);
    console.log(`   - Sukses di-generate : ${successCount}`);
    console.log(`   - Gagal (Error API)  : ${failCount}`);
    console.log(`   - Di-skip (Sudah ada): ${skipCount}\n`);

  } catch (dbError) {
    console.error("❌ FATAL ERROR: Gagal terhubung ke Firestore.", dbError);
  }
}

// Jalankan fungsi
massGenerateExpectedOutputs();