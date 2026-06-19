// functions/src/formBuilderService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildMegaAgentPrompt } from "./formBuilderPrompt";

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

export const generateFormTemplateFromAI = onCall(
  { memory: "2GiB", timeoutSeconds: 540, region: "asia-southeast2", secrets: [geminiApiKeySecret], cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const data = request.data as any;
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
      
      // KITA MATIKAN responseSchema SEPENUHNYA!
      // Kita biarkan AI menggunakan memori maksimal tanpa halangan struktural
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro", 
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2, 
        }
      });

      const params = {
        trackName: data.trackName || "Asesmen Umum",
        config: data.aiPromptConfig || {},
        archetypeInstruction: data.archetypeInstruction || ""
      };

      const prompt = buildMegaAgentPrompt(params);
      
      let attempt = 0;
      const MAX_ATTEMPTS = 3;

      while (attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
          console.log(`🔄 [Mencoba Generate JSON - Percobaan ${attempt}/${MAX_ATTEMPTS}]`);
          
          const result = await withRetry(() => model.generateContent(prompt));
          const rawText = result.response.text();

          // =========================================================================
          // 🛡️ THE BULLETPROOF EXTRACTOR
          // Mengabaikan celotehan AI dan hanya mengambil data dari { pertama hingga } terakhir
          // =========================================================================
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          
          if (!jsonMatch) {
            throw new Error("AI tidak menghasilkan struktur objek JSON.");
          }

          const extractedJson = jsonMatch[0];

          // PARSING JSON
          const parsedObject = JSON.parse(extractedJson);
          
          // Log hasil riset rahasia AI ke console Firebase
          if (parsedObject.researchNotes) {
             console.log("📚 [HASIL RISET TEORI AI]:", parsedObject.researchNotes);
          }

          const finalStepsArray = parsedObject.steps || [];
          
          if (!Array.isArray(finalStepsArray) || finalStepsArray.length === 0) {
            throw new Error("JSON terekstrak, tetapi array 'steps' kosong/hilang.");
          }

          console.log("✅ [SUKSES] JSON berhasil divalidasi dan diekstrak!");
          return cleanUndefinedAndNull(finalStepsArray);

        } catch (parseError: any) {
          console.error(`❌ [GAGAL PARSING JSON pada Percobaan ${attempt}]`, parseError.message);
          
          if (attempt >= MAX_ATTEMPTS) {
            throw new Error("Sistem AI mengalami kendala merangkai format formulir (terpotong atau tidak valid). Harap ulangi.");
          }
        }
      }

    } catch (error: any) {
      console.error("====== ERROR GENERATE PIPELINE ======");
      console.error(error);
      throw new HttpsError("internal", `Kendala sistem AI: ${error.message}`);
    }
  }
);