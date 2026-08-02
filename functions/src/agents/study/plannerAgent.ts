import OpenAI from "openai";
import { safeJsonParse } from "./shared";

const buildPlannerPrompt = (projectData: any, outline: any) => `
Anda adalah Chapter Planner untuk kajian riset profesional berskala besar.

TUGAS:
Untuk setiap bab di bawah ini, buat *planning draft* yang sangat terstruktur, analitis, dan mendalam, yang nanti akan dipakai oleh agen penulis (*writer agent*).
Setiap bab WAJIB mencakup:
- objective: Sasaran akademik dari bab ini (fokus pada argumen, bukan sekadar merangkum).
- targetWordCount: Target panjang kata.
- suggestedSections: Daftar sub-bab. WAJIB menggunakan penomoran sub-bab hierarkis standar akademik (contoh: "1.1 Latar Belakang", "1.2 Kerangka Teori"). Pastikan nomor sub-bab sesuai dengan urutan babnya (jika ini Bab 2, maka sub-bab diawali 2.1, 2.2, dst). Gunakan *Title Case*, jangan huruf kapital semua. Susun agar bab mengalir deduktif dan tidak terasa dangkal.
- evidenceFocus: Aspek pembuktian spesifik yang harus ditekankan (misal: analisis klaim X menggunakan data Y).

KONTEKS PROYEK:
- Judul: ${projectData.title}
- Pertanyaan riset: ${projectData.researchQuestion}
- Target kata total: ${projectData.targetWordCount || 25000}

OUTLINE:
${JSON.stringify(outline)}

OUTPUT WAJIB JSON VALID:
{
  "chapters": [
    {
      "chapterId": "chapter-01",
      "objective": "...",
      "targetWordCount": 2500,
      "suggestedSections": ["..."],
      "evidenceFocus": ["..."]
    }
  ]
}
`;

export const executeStudyPlanner = async (projectData: any, outline: any, apiKey: string) => {
  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });

  const response = await client.chat.completions.create({
    model: String(projectData.modelPlan?.planner || "deepseek-v4-flash"),
    messages: [
      { role: "system", content: "Anda adalah planner bab kajian. Jawab hanya JSON valid." },
      { role: "user", content: buildPlannerPrompt(projectData, outline) },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const plannerJson = safeJsonParse(response.choices[0]?.message?.content || "{}", { chapters: [] as any[] });
  return Array.isArray(plannerJson.chapters) ? plannerJson.chapters : [];
};