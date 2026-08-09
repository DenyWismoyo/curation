import OpenAI from "openai";
import { safeJsonParse, StudySource } from "./shared";

const buildArchitectPrompt = (projectData: any, sources: StudySource[]) => `
Anda adalah Study Architect senior untuk penyusunan kajian akademis dan profesional yang komprehensif.

TUGAS:
1. Susun outline kajian yang berbobot, kredibel, dan berstandar akademik tinggi (setara naskah kebijakan atau tesis). 
2. Hasilkan 6 sampai 10 bab inti. Pastikan struktur mengikuti alur deduktif logis.
3. ${projectData.writingTone === 'crypto_academy' ? 'WAJIB buat penamaan Modul yang Sangat Menarik dan mengundang rasa penasaran (engaging hook) dengan tambahan 1 emoji relevan. Contoh: "Modul 1: 🏦 Mengapa FTX Runtuh?", "Modul 2: 🕵️ Jejak On-Chain Paus". JANGAN gunakan istilah "Bab" bergaya makalah.' : 'WAJIB gunakan format penamaan dan penomoran bab standar akademik yang seragam. Contoh: "Bab 1: Pendahuluan", "Bab 2: Kerangka Hukum dan Kebijakan". DILARANG menggunakan huruf kapital semua pada judul. Gunakan *Title Case*.'}
4. Setiap bab harus punya ringkasan singkat yang jelas, key themes spesifik, dan petunjuk sumber yang relevan.
5. Gunakan isi sumber yang telah diekstrak untuk merancang alur analisis kajian secara tajam.

PROYEK:
- Judul: ${projectData.title}
- Deskripsi: ${projectData.description || "-"}
- Pertanyaan riset: ${projectData.researchQuestion}
- Metodologi: ${projectData.methodology || "literature_review"}
- Target halaman: ${projectData.targetPages || 100}
- Target kata: ${projectData.targetWordCount || 25000}
- Gaya sitasi: ${projectData.citationStyle || "APA"}
- Tone: ${projectData.writingTone || "academic"}

SUMBER TERSEDIA:
${sources.map((source, index) => `${index + 1}. [${source.sourceId}] ${source.title} | kind=${source.kind} | extractedChars=${source.extractedCharCount || 0} | url=${source.sourceUrl || '-'} | hint=${source.summaryHint || '-'}\nPreview: ${(source.extractedText || '').slice(0, 600)}`).join("\n\n")}

OUTPUT WAJIB JSON VALID:
{
  "outline": {
    "chapters": [
      {
        "chapterId": "chapter-01",
        "title": "...",
        "summary": "...",
        "keyThemes": ["..."],
        "relevantSourceIds": ["..."]
      }
    ]
  }
}
`;

export const executeStudyArchitect = async (projectData: any, sources: StudySource[], apiKey: string) => {
  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });

  const response = await client.chat.completions.create({
    model: String(projectData.modelPlan?.architect || "deepseek-v4-pro"),
    messages: [
      { role: "system", content: "Anda adalah arsitek kajian senior. Jawab hanya JSON valid." },
      { role: "user", content: buildArchitectPrompt(projectData, sources) },
    ],
    temperature: 0.35,
    response_format: { type: "json_object" },
  });

  const architectJson = safeJsonParse(response.choices[0]?.message?.content || "{}", { outline: { chapters: [] } });
  return architectJson.outline || { chapters: [] };
};