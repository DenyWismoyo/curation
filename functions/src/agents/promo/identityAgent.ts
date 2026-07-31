// functions/src/agents/promo/identityAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateProgramIdentity = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { trackName, trackDescription, targetAudience, formPurpose } = request.data;

  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Naming style disesuaikan dengan formPurpose & audience
  // ═══════════════════════════════════════════════════════════════════
  const purposeNamingGuide: Record<string, string> = {
    'counseling': `KONTEKS KONSELING / PSIKOLOGI: Gunakan kata-kata yang hangat, empatik, dan humanis. Contoh pilihan kata premium: "Peta Diri", "Navigasi Batin", "Profil Resiliensi", "Kompas Emosi", "Indeks Kesejahteraan", "Blueprint Karakter", "Radar Potensi".`,
    'monitoring': `KONTEKS MONITORING / EVALUASI: Gunakan kata-kata yang presisi, berbasis data, dan progresif. Contoh pilihan kata premium: "Dashboard Progres", "Indeks Capaian", "Radar Kinerja", "Monitor Implementasi", "Pulse Check", "Scorecard Periodik".`,
    'consultation': `KONTEKS KONSULTASI PAKAR: Gunakan kata-kata yang berbobot, ekspertis, dan solusi-oriented. Contoh pilihan kata premium: "Diagnosis Strategis", "Expert Review", "Gap Analysis", "Audit Mendalam", "Asesmen Klinis", "Konsultasi Terstruktur".`,
    'assessment': `KONTEKS ASESMEN / PENILAIAN: Gunakan kata-kata yang terukur, profesional, dan komprehensif. Contoh pilihan kata premium: "Indeks Kesiapan", "Pemetaan Kompetensi", "Radar Kematangan", "Blueprint Akselerasi", "Navigasi Transformasi", "Profil Strategis".`,
  };

  const audienceNamingGuide: Record<string, string> = {
    'individual': 'Target INDIVIDU: Judul harus terasa personal dan relevan bagi satu orang (gunakan framing personal spt "Profil Karierku", "Kompas Hidupku", atau langsung ke substansi tanpa kata "perusahaan").',
    'student': 'Target PELAJAR/MAHASISWA: Judul terasa inspiratif, aspirasional, dan relevan untuk generasi muda.',
    'gen_z': 'Target GEN Z / MILENIAL: Judul harus sangat kekinian, relate dengan isu mental health/burnout/hustle culture, tidak menggurui, dan menggunakan bahasa yang engaging/catchy.',
    'parenting': 'Target ORANG TUA / PARENTING: Judul terasa hangat, penuh empati, supportif, dan solutif untuk tantangan pengasuhan anak modern.',
    'couple': 'Target PASANGAN / RELATIONSHIP: Judul terasa intim, fokus pada harmoni, resolusi konflik, dan pertumbuhan bersama (koneksi/chemistry).',
    'government': 'Target PEMERINTAH: Judul terasa resmi, kredibel, dan berbasis kebijakan publik/tata kelola.',
    'community': 'Target KOMUNITAS/NGO: Judul terasa inklusif, berbasis dampak sosial, dan kolaboratif.',
    'startup': 'Target STARTUP: Judul terasa bold, tech-forward, dan berbasis traksi/inovasi.',
    'umkm': 'Target UMKM: Judul terasa praktis, membumi, dan berorientasi pertumbuhan bisnis nyata.',
    'company': 'Target KORPORAT/B2B: Judul terasa enterprise-grade, strategis, dan profesional tinggi.',
  };

  const purposeKey = formPurpose || 'assessment';
  const audienceKey = targetAudience || 'company';
  const namingContextGuide = purposeNamingGuide[purposeKey] || purposeNamingGuide['assessment'];
  const audienceGuide = audienceNamingGuide[audienceKey] || audienceNamingGuide['company'];

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            trackName: { type: SchemaType.STRING },
            trackDescription: { type: SchemaType.STRING },
            trackIcon: { type: SchemaType.STRING }
          },
          required: ["trackName", "trackDescription", "trackIcon"]
        }
      }
    });

    const prompt = `
      Anda adalah "Chief Brand Strategist" tingkat Enterprise sekaligus "Expert UI/UX Copywriter" yang sangat berpengalaman dalam penamaan produk di berbagai industri global.

      TUGAS UTAMA: Ubah nama program draft menjadi IDENTITAS yang MEMUKAU, UNIVERSAL, dan SANGAT RELEVAN dengan konteksnya — tanpa menghilangkan esensi aslinya.

      INPUT DATA MENTAH:
      - Nama Draft: "${trackName || 'Modul Asesmen'}"
      - Deskripsi Draft: "${trackDescription || ''}"
      - Tujuan Form: ${purposeKey}
      - Target Audiens: ${audienceKey}

      ══════════════════════════════════════════════
      PANDUAN KONTEKS TUJUAN FORM (WAJIB IKUTI):
      ${namingContextGuide}

      PANDUAN KONTEKS TARGET AUDIENS (WAJIB IKUTI):
      ${audienceGuide}
      ══════════════════════════════════════════════

      ATURAN MERACIK NAMA (trackName):
      1. FORMAT WAJIB (Catchy Hook: Subtitle Deskriptif): Gunakan format dua bagian yang dipisahkan titik dua. Bagian pertama adalah "Hook" yang menarik dan aspirasional, bagian kedua adalah penjelasan apa sebenarnya asesmen ini. 
         - Contoh 1: "Campus to CEO: Entrepreneur Readiness Test"
         - Contoh 2: "UMKM Scale-Up: Akselerasi Menuju Pasar Modern"
         - Contoh 3: "Technopreneur DNA: Petakan Potensi Inovasi Anda"
      2. SANGAT MENJUAL, KEKINIAN & TIDAK KAKU: Nama harus terasa seperti judul buku bestseller, kelas premium, atau campaign digital kekinian. **SANGAT DILARANG menggunakan bahasa birokratis atau akademis yang kaku** (seperti "Penyelarasan Visi", "Optimalisasi Kinerja", "Evaluasi Menyeluruh", "Peningkatan Mutu"). Gunakan bahasa yang luwes, modern, dan langsung memancing emosi/rasa penasaran audiens.
      3. GUNAKAN KATA KUNCI PREMIUM & MODERN: "DNA", "Scale-Up", "Blueprint", "Accelerator", "Navigator", "Playbook", "Hack", "Checkup", "Sync", "Chemistry", "Journey", "Mindset".
      4. SESUAIKAN DENGAN AUDIENS: Jika mahasiswa, gunakan "Campus", "Future", "Talent". Jika UMKM, gunakan "Scale-Up", "Pasar Modern". Jika Corporate, gunakan "Enterprise", "Agility". Jika Pasangan/Couple, gunakan kata hangat & pop seperti "Chemistry", "Sync", "Relationship", "Love Journey".
      5. BAHASA YANG NATURAL: Gunakan gaya bahasa pop-modern atau campuran English-Indonesia yang asik dibaca. JANGAN gunakan padanan kata baku yang terdengar canggung. 
         - Contoh Benar (Pasangan): "Couple Chemistry Check: Seberapa Sinkron Visi Kalian?" 
         - Contoh Salah (Kaku): "Kompas Penyelarasan Visi Pernikahan"

      ATURAN DESKRIPSI (trackDescription):
      1. Tulis layaknya COPYWRITING YANG MENJUAL dalam 2-3 kalimat. BUKAN sekadar deskripsi teknis yang kaku.
      2. Kalimat 1 (The Hook/Pain Point): Sentuh masalah nyata atau mimpi audiens. (Contoh: "Banyak talenta muda terjebak...", "Banyak UMKM stagnan karena...", "Wujudkan mimpimu dari mahasiswa menjadi CEO!").
      3. Kalimat 2-3 (The Solution/Transformation): Jelaskan bahwa asesmen ini hadir untuk mendiagnosa/memetakan hal tersebut, dan sebutkan transformasi yang akan didapat (Contoh: "...memberikan panduan presisi untuk mengenali peran unik Anda...", "...memberikan peta jalan strategis agar UMKM Anda naik kelas...").
      4. NADA BICARA: Energik, empatik, berwibawa, dan sangat menginspirasi. Buat pembaca merasa INGIN SEGERA MENGISI form tersebut.
      5. DILARANG KAKU: Jangan gunakan bahasa birokratis atau akademis yang membosankan. Hindari awalan "Modul ini bertujuan untuk...". Langsung tembak ke emosi dan solusi!

      ATURAN IKON (trackIcon):
      Pilih 1 nama ikon dari library 'lucide-react' yang PALING SESUAI. Format PascalCase murni.
      - Asesmen bisnis/korporat: Target, TrendingUp, BarChart3, LineChart, Briefcase, ShieldCheck, Award
      - Konseling/personal: Heart, Brain, User, Smile, Compass, Lightbulb, Sparkles, Star
      - Monitoring/evaluasi: Activity, Gauge, LayoutDashboard, CheckCircle2, ClipboardCheck, Radar
      - Konsultasi/audit: MessageSquare, Users, BookOpen, Microscope, Search, Scale
      - Pemerintah: Building2, Scale, Shield, Flag, Landmark
      - Komunitas/NGO: Users, Globe, HandHeart, TreePine, Network
      - Pendidikan: GraduationCap, BookOpen, PenTool, School, Library
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});