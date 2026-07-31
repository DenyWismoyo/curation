// functions/src/outputService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// 1. FUNGSI EKSISTING: Generate Selling Points (Output)
export const generateTemplateSellingPoints = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { trackName, trackDescription, aiPromptConfig } = request.data;

    if (!aiPromptConfig) throw new HttpsError("invalid-argument", "Konfigurasi Otak AI tidak ditemukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
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
                title: { type: SchemaType.STRING, description: "Judul output (misal: 'Rencana Aksi Harian', 'Peta Mitigasi Risiko')" },
                description: { type: SchemaType.STRING, description: "Penjelasan copywriting 1 kalimat mengenai manfaat dari output ini." }
              }
            }
          }
        }
      });

      const prompt = `
        Konteks Modul: "${trackName}"
        Deskripsi: "${trackDescription}"
        
        Kerangka yang akan dianalisis AI:
        - Metrik yang dinilai: ${JSON.stringify(aiPromptConfig.expectedMetrics)}
        - Fokus Risiko: ${aiPromptConfig.riskFramework || 'Risiko umum'}
        - Target Rekomendasi: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}

        Buatlah TEPAT 4 poin benefit output yang memikat dalam bahasa Indonesia.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const sellingPoints = JSON.parse(rawText);
      return { success: true, sellingPoints };

    } catch (error: any) {
      console.error("Gagal generate copywriting:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI.");
    }
  }
);

// 2. FUNGSI BARU: Auto-Generate Prompt Anchors (Profil & Metodologi)
export const generatePromptAnchors = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { trackName, trackDescription, targetAudience, formPurpose, aiPromptConfig } = request.data;

    if (!trackName) throw new HttpsError("invalid-argument", "Nama Program wajib diisi untuk merumuskan konteks.");

    // ═══════════════════════════════════════════════════════════════════
    // PERBAIKAN: Baca formPurpose dan aiPromptConfig untuk menghasilkan
    // anchor yang benar-benar spesifik dan relevan sebagai panduan AI
    // ═══════════════════════════════════════════════════════════════════
    const purposeKey = formPurpose || aiPromptConfig?.formPurpose || 'assessment';
    const audienceKey = targetAudience || aiPromptConfig?.targetAudience || 'company';

    const purposeGuide: Record<string, string> = {
      'counseling': 'Ini adalah form KONSELING. Profil subjek harus mencakup kondisi psikologis, latar belakang emosional, dan kebutuhan dukungan. Metodologi dari framework psikologi/konseling (CBT, ACT, Positive Psychology, MBSR, dll).',
      'monitoring': 'Ini adalah form MONITORING/EVALUASI. Profil subjek harus mencakup posisi dalam siklus program, baseline sebelumnya, dan target yang harus dicapai. Metodologi dari framework evaluasi (Kirkpatrick, Logframe, OECD-DAC, dll).',
      'consultation': 'Ini adalah form KONSULTASI PAKAR. Profil subjek harus mencakup masalah spesifik yang dihadapi, konteks industri/domain, dan kesiapan untuk berubah. Metodologi dari framework problem-solving (Design Thinking, Root Cause Analysis, McKinsey 7S, dll).',
      'assessment': 'Ini adalah form ASESMEN/PENILAIAN. Profil subjek harus mencakup karakteristik yang akan dinilai, kondisi baseline, dan aspek yang paling kritis untuk dievaluasi. Metodologi dari framework penilaian yang relevan dengan industri/domain.',
    };

    const audienceGuide: Record<string, string> = {
      'individual': 'Subjek adalah INDIVIDU. Profil mencakup: peran/profesi, tingkat pengalaman, kondisi personal yang relevan, dan motivasi mengikuti asesmen.',
      'student': 'Subjek adalah PELAJAR/MAHASISWA. Profil mencakup: jenjang pendidikan, program studi, tahap akademik, dan tujuan karir/pengembangan.',
      'gen_z': 'Subjek adalah GEN Z / MILENIAL. Profil mencakup: tantangan generasi modern, mental health, tuntutan karir (hustle culture), keseimbangan emosional, dan preferensi value.',
      'parenting': 'Subjek adalah ORANG TUA (PARENTING). Profil mencakup: tahap perkembangan anak, pola asuh, stres pengasuhan, kedekatan keluarga, dan tantangan modern parenting.',
      'couple': 'Subjek adalah PASANGAN. Profil mencakup: tahap hubungan (pra-nikah/menikah), dinamika komunikasi, resolusi konflik, dan tujuan finansial/koneksi emosional bersama.',
      'government': 'Subjek adalah INSTANSI PEMERINTAH/ASN. Profil mencakup: jenis instansi, level jabatan, bidang tugas, dan konteks kebijakan yang relevan.',
      'community': 'Subjek adalah KOMUNITAS/NGO/YAYASAN. Profil mencakup: skala komunitas, isu sosial yang diatasi, model operasional, dan kematangan organisasi.',
      'startup': 'Subjek adalah STARTUP. Profil mencakup: tahap pertumbuhan (ideasi/MVP/growth), sektor industri, model bisnis, dan traksi yang sudah dicapai.',
      'umkm': 'Subjek adalah UMKM/BISNIS KECIL MENENGAH. Profil mencakup: kategori usaha, skala operasional, lama beroperasi, dan tantangan utama yang dihadapi.',
      'company': 'Subjek adalah PERUSAHAAN/KORPORAT. Profil mencakup: ukuran perusahaan, sektor industri, posisi pasar, dan fokus strategis.',
    };

    const extraContext = aiPromptConfig?.expectedMetrics?.length > 0
      ? `\nMetrik yang akan diukur: ${JSON.stringify(aiPromptConfig.expectedMetrics)}`
      : '';
    const blocksContext = aiPromptConfig?.expectedAnalysisBlocks?.length > 0
      ? `\nBlok analisis yang diharapkan: ${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}`
      : '';

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: "Anda adalah AI Architect dan Pakar Asesmen Global yang memahami ratusan framework evaluasi, psikologi, manajemen, dan pengembangan organisasi. Tugas Anda merumuskan KONTEKS SPESIFIK yang sangat tajam dan METODOLOGI yang presisi — dua teks ini akan menjadi PANDUAN UTAMA bagi sistem AI dalam menghasilkan template asesmen dan form yang tepat sasaran.",
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["specificTargetContext", "methodologyContext", "formBuilderInstruction", "aiPersona"],
            properties: {
              specificTargetContext: { 
                type: SchemaType.STRING, 
                description: "Profil spesifik dan sangat detail tentang siapa subjek penilaian, kondisi mereka, dan aspek kritis yang akan dinilai. 3-4 kalimat padat yang kaya informasi kontekstual." 
              },
              methodologyContext: { 
                type: SchemaType.STRING, 
                description: "Metodologi, framework, atau standar global yang PALING TEPAT untuk asesmen ini, beserta alasan singkat mengapa dipilih dan bagaimana kerangkanya diterapkan. 3-4 kalimat padat." 
              },
              formBuilderInstruction: {
                type: SchemaType.STRING,
                description: "Instruksi spesifik bagi arsitek AI mengenai cara meracik soal untuk audiens ini. Berisi panduan gaya penyusunan soal yang selaras dengan target."
              },
              aiPersona: {
                type: SchemaType.STRING,
                description: "Gelar/Identitas pakar yang paling relevan (AI Persona) untuk melakukan asesmen ini (Contoh: 'Konsultan Psikologi Klinis & Pakar Karir')."
              }
            }
          }
        }
      });

      const prompt = `
        DATA PROGRAM:
        - Nama Program: "${trackName}"
        - Deskripsi: "${trackDescription || '-'}"
        - Tujuan Form: ${purposeKey}
        - Target Audiens: ${audienceKey}
        ${extraContext}
        ${blocksContext}

        PANDUAN KONTEKS TUJUAN:
        ${purposeGuide[purposeKey] || purposeGuide['assessment']}

        PANDUAN KONTEKS AUDIENS:
        ${audienceGuide[audienceKey] || audienceGuide['company']}

        TUGAS:
        1. PROFIL SPESIFIK SUBJEK (specificTargetContext): 
           Rumuskan deskripsi yang sangat tajam dan kaya tentang siapa subjek yang akan dinilai. 
           Harus mencakup: karakteristik spesifik subjek, kondisi atau tahap yang relevan, aspek kritis yang akan dievaluasi, dan nuansa konteks yang perlu dipahami AI.
           CONTOH KUALITAS YANG DIINGINKAN: "Subjek adalah UMKM di sektor kuliner yang telah beroperasi 1-5 tahun dengan omzet Rp50jt-500jt/tahun. Asesmen ini ditujukan untuk memetakan kesiapan mereka dalam memasuki ekosistem digital dan platform e-commerce — mencakup kapasitas produksi, literasi digital, manajemen keuangan informal, serta potensi scaling yang belum dioptimalkan."
           
        2. METODOLOGI (methodologyContext):
           Identifikasi framework atau metodologi TERBAIK yang relevan untuk program ini.
           Harus mencakup: nama framework spesifik, alasan dipilih untuk konteks ini, dan bagaimana kerangkanya diterapkan dalam asesmen.
           CONTOH KUALITAS YANG DIINGINKAN: "Asesmen mengadopsi kerangka Business Model Canvas (BMC) dari Osterwalder dikombinasikan dengan Growth Readiness Framework UNDP. Pemilihan BMC memungkinkan pemetaan 9 elemen bisnis secara holistik, sementara Growth Readiness Framework mengukur kesiapan kapasitas internal. Standar skoring mengacu pada Benchmark UMKM Kemendag 2023 untuk memberikan konteks komparatif yang relevan."
           
        3. INSTRUKSI FORM BUILDER (formBuilderInstruction):
           Berikan instruksi kuat kepada AI pembuat formulir tentang bagaimana meracik soal yang tepat untuk audiens ini. 
           CONTOH KUALITAS: "Gunakan bahasa yang sederhana namun menggali. Hindari jargon teknis yang membingungkan UMKM. Fokus pada validasi lapangan bukan teori."
           
        4. AI PERSONA (aiPersona):
           Sebutkan gelar/identitas pakar yang paling tepat untuk melakukan asesmen ini dan memberikan laporan Action Plan nantinya.
           CONTOH KUALITAS: "Konsultan Strategi Bisnis UMKM & Pakar Digital Marketing"
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const anchors = JSON.parse(rawText);
      return { success: true, anchors };

    } catch (error: any) {
      console.error("Gagal generate anchors:", error);
      throw new HttpsError("internal", error.message || "Gagal merumuskan Konteks Anchor.");
    }
  }
);