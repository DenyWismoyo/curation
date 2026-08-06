// functions/src/fieldEnhancerService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// ============================================================================
// FUNGSI 1: ENHANCE SELURUH PERTANYAAN DALAM 1 SEKSI (BATCH PROCESSING)
// ============================================================================
export const enhanceStepLogic = onCall({
    memory: "512MiB",
    timeoutSeconds: 180,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { trackName, templateId, stepTitle, stepFields, aiPromptConfig } = request.data;
    
    if (!stepFields || !Array.isArray(stepFields) || stepFields.length === 0) {
      throw new HttpsError("invalid-argument", "Data pertanyaan dalam seksi ini kosong.");
    }

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
        systemInstruction: "Anda adalah 'AI Form Architect'. Tugas Anda merombak KUMPULAN pertanyaan mentah dalam satu Seksi (Step) menjadi struktur form JSON interaktif tingkat lanjut. Anda WAJIB menggunakan sintaks Markdown (**teks tebal** atau *teks miring*) untuk menyoroti istilah penting agar tampilan antarmuka (UI) lebih estetik dan mudah dibaca (scannable).",
        generationConfig: {
          temperature: 0.1, // Harus rendah agar nilai ID dan logika ShowIf tidak meleset
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "label", "type", "required", "gridSpan"],
              properties: {
                id: { type: SchemaType.STRING, description: "ID unik (tanpa spasi). Pertahankan ID asli jika ada." },
                label: { type: SchemaType.STRING, description: "Bahasa profesional. WAJIB gunakan **teks tebal** pada kata kunci utama." },
                description: { type: SchemaType.STRING, description: "Penjelasan pendukung. Gunakan **teks tebal** atau *miring* untuk penekanan." },
                aiReasoning: { type: SchemaType.STRING, description: "1 kalimat penjelasan cerdas. Gunakan **teks tebal** pada istilah analitik utama." },
                type: { type: SchemaType.STRING },
                required: { type: SchemaType.BOOLEAN },
                gridSpan: { type: SchemaType.INTEGER },
                fileAccept: { type: SchemaType.STRING },
                options: { 
                  type: SchemaType.ARRAY, 
                  items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                      label: { type: SchemaType.STRING }, 
                      weight: { type: SchemaType.INTEGER } 
                    } 
                  } 
                },
                showIf: { 
                  type: SchemaType.OBJECT, 
                  description: "Logika kondisional untuk menampilkan pertanyaan ini berdasarkan jawaban sebelumnya.",
                  required: ["fieldId", "equals"], // WAJIB DIISI OLEH AI
                  properties: { 
                    fieldId: { type: SchemaType.STRING, description: "ID dari pertanyaan yang memicu tampilnya field ini." }, 
                    equals: { type: SchemaType.STRING, description: "SAMA PERSIS (case-sensitive) dengan label opsi dari field pemicu." } 
                  } 
                }
              }
            }
          }
        }
      });

      const prompt = `
        Konteks Program Asesmen: "${trackName || 'Umum'}"
        Target Audiens: "${aiPromptConfig?.targetAudience === 'individual' ? 'Personal / Individu' : 'Bisnis / Perusahaan'}"
        Judul Seksi Form (Step): "${stepTitle}"
        
        DATA PERTANYAAN MENTAH (Satu Seksi Utuh):
        ${JSON.stringify(stepFields, null, 2)}
        
        ATURAN PENYEMPURNAAN MASSAL (MUTLAK):
        1. EVALUASI KESELURUHAN: Baca semua pertanyaan di atas. Pertahankan nilai "id" asli untuk pertanyaan utama agar relasi data tidak rusak.
        2. PERTAJAM LABEL & OPTIMALISASI UI MARKDOWN: Ubah bahasa pertanyaan mentah menjadi sangat profesional. WAJIB sematkan Markdown (**bold** atau *italic*) pada "label", "description", dan "aiReasoning". (Cth: "Apakah Anda telah memiliki **Sertifikasi ISO 9001**?"). JANGAN pernah merubah ID/Label pertanyaan identitas dasar seperti 'namaUsaha'.
        3. CERDASKAN TIPE INPUT: Jika input mentah adalah 'text', evaluasi apakah lebih baik diubah menjadi 'radio' atau 'select' berbobot (weight 0-100).
        4. BERIKAN ALASAN AI (aiReasoning): Tuliskan 1 kalimat tajam penjelasan analitis untuk setiap pertanyaan (kecuali identitas dasar).
        5. MULTI-LEVEL SHOW-IF (INTEGRITAS LOGIKA KETAT): Jika suatu pertanyaan utama memiliki opsi (radio/select) yang berpotensi memiliki celah risiko (misal opsi: "Belum Punya" atau "Sering Bermasalah"), Anda WAJIB menyisipkan Field Tambahan tepat di bawahnya menggunakan properti "showIf".
           - Tipe Cabang BEBAS: Field tambahan TIDAK HARUS 'file' atau 'textarea'. Anda bebas menggunakan 'checkbox', 'radio', atau 'select' jika ingin melakukan pendalaman investigasi.
           - ATURAN FIELD_ID: Properti "showIf.fieldId" pada field cabang WAJIB SAMA PERSIS dengan properti "id" pada field utama di atasnya.
           - ATURAN EQUALS: Properti "showIf.equals" TIDAK BOLEH KOSONG. Anda WAJIB menyalin (copy-paste) persis salah satu nilai "label" dari array "options" milik field utama tersebut. Jangan mengarang teks pemicu baru!
        6. OUTPUT: Kembalikan array JSON utuh berisi SELURUH pertanyaan (utama dan cabang) yang sudah disempurnakan secara berurutan.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }

      const enhancedFields = JSON.parse(rawText);
      return { success: true, fields: enhancedFields };

    } catch (error: any) {
      console.error("Gagal menyempurnakan seksi form:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI Step Co-Pilot.");
    }
  }
);

// ============================================================================
// FUNGSI 2: ENHANCE SINGLE PERTANYAAN (FALLBACK / MANUAL OVERRIDE)
// ============================================================================
export const enhanceFieldLogic = onCall({
    memory: "256MiB",
    timeoutSeconds: 60,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { trackName, templateId, currentField, aiPromptConfig } = request.data;
    
    if (!currentField || !currentField.label) {
      throw new HttpsError("invalid-argument", "Data pertanyaan mentah tidak ditemukan.");
    }

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
        systemInstruction: "Anda adalah 'AI Field Co-Pilot'. Tugas Anda adalah merombak 1 pertanyaan kuesioner mentah/sederhana menjadi struktur form JSON interaktif tingkat lanjut yang berbobot, logis, kaya akan format Markdown UI (**teks tebal**), dan memiliki cabang showIf presisi.",
        generationConfig: {
          temperature: 0.1, 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "label", "type", "required", "gridSpan"],
              properties: {
                id: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING, description: "Bahasa profesional. Wajib tebalkan (**bold**) pada kata kunci." },
                description: { type: SchemaType.STRING },
                aiReasoning: { type: SchemaType.STRING, description: "1 kalimat penjelasan. Tebalkan (**bold**) metrik utamanya." },
                type: { type: SchemaType.STRING },
                required: { type: SchemaType.BOOLEAN },
                gridSpan: { type: SchemaType.INTEGER },
                fileAccept: { type: SchemaType.STRING },
                options: { 
                  type: SchemaType.ARRAY, 
                  items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                      label: { type: SchemaType.STRING }, 
                      weight: { type: SchemaType.INTEGER } 
                    } 
                  } 
                },
                showIf: { 
                  type: SchemaType.OBJECT, 
                  required: ["fieldId", "equals"],
                  properties: { 
                    fieldId: { type: SchemaType.STRING }, 
                    equals: { type: SchemaType.STRING, description: "Wajib diisi menggunakan salah satu nilai label dari field utama." } 
                  } 
                }
              }
            }
          }
        }
      });

      const prompt = `
        Konteks Program Asesmen: "${trackName || 'Umum'}"
        Target Audiens: "${aiPromptConfig?.targetAudience === 'individual' ? 'Personal / Individu' : 'Bisnis / Perusahaan'}"
        
        DATA PERTANYAAN MENTAH (Input dari Admin):
        ${JSON.stringify(currentField, null, 2)}
        
        ATURAN PENYEMPURNAAN (MUTLAK):
        1. PERTAJAM LABEL & OPTIMALISASI MARKDOWN: Ubah bahasa pertanyaan mentah menjadi sangat profesional. WAJIB sematkan Markdown (**bold**) pada kata/istilah kunci.
        2. CERDASKAN TIPE INPUT: Jika input mentah adalah 'text', evaluasi apakah lebih baik diubah menjadi 'radio' atau 'select' berbobot (weight 0-100).
        3. BERIKAN ALASAN AI (aiReasoning): Tuliskan 1 kalimat tajam penjelasan analitis.
        4. MULTI-LEVEL SHOW-IF (INTEGRITAS LOGIKA KETAT): Jika pertanyaan utama memiliki celah, Anda WAJIB menciptakan 1 Field Tambahan di dalam array ini menggunakan "showIf".
           - Cabang bisa berupa 'file', 'textarea', 'checkbox', atau 'radio' tambahan.
           - Properti "showIf.fieldId" WAJIB merujuk pada "id" pertanyaan pertama.
           - Properti "showIf.equals" WAJIB menyalin SAMA PERSIS dengan salah satu "label" dari "options" pertanyaan pertama.
        5. Array keluaran berisi 1 objek (jika tidak butuh cabang) atau 2 objek (jika butuh cabang).
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }

      const enhancedFields = JSON.parse(rawText);
      return { success: true, fields: enhancedFields };

    } catch (error: any) {
      console.error("Gagal menyempurnakan field:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI Field Co-Pilot.");
    }
  }
);