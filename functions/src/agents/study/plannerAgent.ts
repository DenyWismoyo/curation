import OpenAI from "openai";
import { safeJsonParse } from "./shared";

const buildPlannerPrompt = (projectData: any, outline: any) => `
Anda adalah Chapter Planner untuk kajian profesional.

TUGAS:
Untuk setiap bab di bawah ini, buat planning draft ringkas yang nanti dipakai writer agent.
Setiap bab butuh:
- objective
- targetWordCount
- suggestedSections
- evidenceFocus

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