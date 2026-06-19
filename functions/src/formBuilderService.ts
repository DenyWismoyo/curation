// functions/src/formBuilderService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildResearcherPrompt, buildArchitectPrompt } from "./formBuilderPrompt";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const cleanUndefinedAndNull = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(cleanUndefinedAndNull).filter(v => v != null);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v != null && v !== "") 
        .map(([k, v]) => [k, cleanUndefinedAndNull(v)])
    );
  }
  return obj;
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (retries <= 1) throw error;
    console.warn(`⏳ API Gemini sibuk, mencoba ulang... (${retries} retries left)`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

// TIMEOUT DIUBAH KE 540 DETIK (9 MENIT) UNTUK MEMBERI RUANG SELF-HEALING
export const generateFormTemplateFromAI = onCall(
  { memory: "2GiB", timeoutSeconds: 540, region: "asia-southeast2", secrets: [geminiApiKeySecret], cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const data = request.data as any;
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
      
      const modelText = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.4 } });
      
      // PERUBAHAN KRUSIAL: Menghapus responseSchema agar AI tidak stress dan terpotong
      const modelJson = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", 
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1, 
          responseMimeType: "application/json"
        }
      });

      const params = {
        trackName: data.trackName || "Asesmen Umum",
        config: data.aiPromptConfig || {},
        archetypeInstruction: data.archetypeInstruction || ""
      };

      // --- TAHAP 1: THE RESEARCHER AGENT (Dieksekusi sekali saja) ---
      console.log("🤖 [STAGE 1] Agen Peneliti merumuskan landasan...");
      const researcherPrompt = buildResearcherPrompt(params);
      const researcherResult = await withRetry(() => modelText.generateContent(researcherPrompt));
      const researchContext = researcherResult.response.text();

      // --- TAHAP 2: THE ARCHITECT AGENT DENGAN AUTO-HEALING LOOP ---
      console.log("🤖 [STAGE 2] Memulai penyusunan JSON...");
      const architectPrompt = buildArchitectPrompt(params, researchContext);
      
      let attempt = 0;
      const MAX_ATTEMPTS = 3; // Maksimal mencoba 3 kali jika JSON rusak

      while (attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
          console.log(`🔄 [Mencoba Generate JSON - Percobaan ${attempt}/${MAX_ATTEMPTS}]`);
          const architectResult = await withRetry(() => modelJson.generateContent(architectPrompt));
          
          let finalCleanText = architectResult.response.text().trim();
          // Membersihkan potensi markdown sisa
          finalCleanText = finalCleanText.replace(/^```(json)?\n?/gi, "").replace(/```\n?$/g, "").trim();

          // UJI COBA PARSING JSON
          const parsedObject = JSON.parse(finalCleanText);
          const finalStepsArray = parsedObject.steps || [];
          
          if (!Array.isArray(finalStepsArray) || finalStepsArray.length === 0) {
            throw new Error("JSON Valid tapi array steps kosong.");
          }

          console.log("✅ [SUKSES] JSON berhasil divalidasi!");
          return cleanUndefinedAndNull(finalStepsArray); // BERHASIL! Keluar dari loop dan kirim ke Frontend.

        } catch (parseError: any) {
          console.error(`❌ [GAGAL PARSING JSON pada Percobaan ${attempt}]`, parseError.message);
          
          if (attempt >= MAX_ATTEMPTS) {
            // Jika sudah 3 kali masih gagal, baru kita serah menyerah dan infokan ke Frontend
            throw new Error("AI gagal menyusun format JSON setelah 3 kali percobaan. Silakan coba klik Generate lagi.");
          }
          // Jika belum batas maksimal, sistem akan diam diam mengulang loop tanpa disadari Frontend
        }
      }

    } catch (error: any) {
      console.error("====== ERROR GENERATE PIPELINE ======");
      console.error(error);
      throw new HttpsError("internal", `Kendala sistem AI: ${error.message}`);
    }
  }
);