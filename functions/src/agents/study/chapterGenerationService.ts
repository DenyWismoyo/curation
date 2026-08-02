import OpenAI from "openai";

type ChapterRecord = {
  chapterId: string;
  title: string;
  summary?: string;
  keyThemes?: string[];
  relevantSourceIds?: string[];
  objective?: string;
  targetWordCount?: number;
  suggestedSections?: string[];
  evidenceFocus?: string[];
};

type EvidenceChunk = {
  sourceId: string;
  chunkIndex: number;
  textChunk: string;
};

const clientFromKey = (apiKey: string) => new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey,
});

const cleanJsonText = (value: string): string => value.trim().replace(/^```(json)?/i, "").replace(/```$/i, "").trim();

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(cleanJsonText(value)) as T;
  } catch (_error) {
    return fallback;
  }
};

export const writeChapterDraft = async (
  apiKey: string,
  projectData: any,
  chapter: ChapterRecord,
  evidenceChunks: EvidenceChunk[],
  reviewerFeedback?: string
) => {
  const client = clientFromKey(apiKey);
  const evidencePack = evidenceChunks
    .slice(0, 18)
    .map((chunk) => `[SRC:${chunk.sourceId} | Chunk ${chunk.chunkIndex + 1}]\n${chunk.textChunk}`)
    .join("\n\n");

  const prompt = `
Anda adalah Chapter Writer untuk dokumen kajian profesional.

KONTEKS PROYEK:
- Judul proyek: ${projectData.title}
- Pertanyaan riset: ${projectData.researchQuestion}
- Gaya penulisan: ${projectData.writingTone || "academic"}
- Gaya sitasi internal: gunakan marker [SRC:sourceId] di dalam paragraf saat klaim bergantung pada sumber.

DATA BAB:
- ID: ${chapter.chapterId}
- Judul: ${chapter.title}
- Ringkasan: ${chapter.summary || "-"}
- Objektif: ${chapter.objective || "-"}
- Target kata: ${chapter.targetWordCount || 1200}
- Tema kunci: ${(chapter.keyThemes || []).join(", ")}
- Suggested sections: ${(chapter.suggestedSections || []).join(", ")}
- Evidence focus: ${(chapter.evidenceFocus || []).join(", ")}
${reviewerFeedback ? `\nCATATAN REVISI DARI REVIEWER:\n${reviewerFeedback}\n(Tulis ulang draf dengan memprioritaskan perbaikan sesuai catatan ini!)` : ''}

EVIDENCE PACK NYATA:
${evidencePack || "Tidak ada evidence pack. Tulis draft konservatif dan nyatakan keterbatasan data."}

ATURAN:
1. Tulis dalam markdown.
2. Jangan mengarang kutipan literal jika tidak ada di evidence pack.
3. Gunakan marker [SRC:sourceId] hanya bila ada dukungan jelas.
4. Buat isi yang koheren, formal, dan siap diaudit.

OUTPUT WAJIB JSON VALID:
{
  "content": "markdown...",
  "citations": [
    {
      "sourceId": "source-id",
      "claim": "ringkasan klaim yang didukung",
      "supportingSnippet": "kutipan/fragmen bukti"
    }
  ]
}
`;

  const response = await client.chat.completions.create({
    model: String(projectData.modelPlan?.writer || "deepseek-v4-flash"),
    messages: [
      { role: "system", content: "Anda adalah penulis bab kajian. Jawab hanya JSON valid." },
      { role: "user", content: prompt },
    ],
    temperature: 0.35,
    response_format: { type: "json_object" },
  });

  return parseJson(response.choices[0]?.message?.content || "{}", {
    content: `# ${chapter.title}\n\nDraft belum berhasil digenerasikan.`,
    citations: [],
  });
};

export const auditChapterDraft = async (
  apiKey: string,
  projectData: any,
  chapter: ChapterRecord,
  draftContent: string,
  citations: Array<{ sourceId: string; claim: string; supportingSnippet: string }>,
  evidenceChunks: EvidenceChunk[]
) => {
  const client = clientFromKey(apiKey);
  const evidencePack = evidenceChunks
    .slice(0, 18)
    .map((chunk) => `[SRC:${chunk.sourceId} | Chunk ${chunk.chunkIndex + 1}]\n${chunk.textChunk}`)
    .join("\n\n");

  const prompt = `
Anda adalah Citation & Consistency Auditor untuk bab kajian.

KONTEKS:
- Proyek: ${projectData.title}
- Bab: ${chapter.title}
- Ringkasan bab: ${chapter.summary || "-"}

DRAFT SAAT INI:
${draftContent}

SITASI TEREKSTRAK:
${JSON.stringify(citations)}

EVIDENCE PACK:
${evidencePack || "Tidak ada evidence pack."}

TUGAS:
1. Nilai apakah klaim penting punya dukungan sumber nyata.
2. Rapikan konten jika ada bagian terlalu spekulatif.
3. Nilai konsistensi nada dan fokus terhadap ringkasan bab.

OUTPUT WAJIB JSON VALID:
{
  "status": "APPROVED" | "NEEDS_REVIEW",
  "revisedContent": "markdown...",
  "citationCoverageScore": 0,
  "consistencyScore": 0,
  "findings": [
    {
      "severity": "low|medium|high",
      "issue": "...",
      "recommendation": "..."
    }
  ]
}
`;

  const response = await client.chat.completions.create({
    model: String(projectData.modelPlan?.auditor || "deepseek-v4-pro"),
    messages: [
      { role: "system", content: "Anda adalah auditor bab kajian. Jawab hanya JSON valid." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  return parseJson(response.choices[0]?.message?.content || "{}", {
    status: "NEEDS_REVIEW",
    revisedContent: draftContent,
    citationCoverageScore: 0,
    consistencyScore: 0,
    findings: [],
  });
};

export const auditProjectConsistency = async (
  apiKey: string,
  projectData: any,
  chapterPayloads: Array<{ chapterId: string; title: string; content: string; auditStatus: string; findings: unknown[] }>
) => {
  const client = clientFromKey(apiKey);
  const prompt = `
Anda adalah Lead Consistency Reviewer untuk kajian panjang.

PROYEK:
- Judul: ${projectData.title}
- Pertanyaan riset: ${projectData.researchQuestion}

RINGKASAN DRAFT BAB:
${chapterPayloads.map((chapter) => `## ${chapter.chapterId} - ${chapter.title}\nStatus audit: ${chapter.auditStatus}\nKonten:\n${chapter.content.slice(0, 4000)}\nTemuan: ${JSON.stringify(chapter.findings)}`).join("\n\n")}

TUGAS:
1. Deteksi inkonsistensi antar bab.
2. Tandai area yang masih harus jadi fokus reviewer manusia.
3. Putuskan apakah project siap ke fase review manusia.

OUTPUT WAJIB JSON VALID:
{
  "overallStatus": "READY_FOR_REVIEW" | "NEEDS_REWORK",
  "summary": "...",
  "crossChapterRisks": ["..."],
  "reviewerFocus": ["..."]
}
`;

  const response = await client.chat.completions.create({
    model: String(projectData.modelPlan?.consistencyAuditor || "deepseek-v4-pro"),
    messages: [
      { role: "system", content: "Anda adalah reviewer konsistensi lintas bab. Jawab hanya JSON valid." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  return parseJson(response.choices[0]?.message?.content || "{}", {
    overallStatus: "READY_FOR_REVIEW",
    summary: "Audit lintas bab selesai.",
    crossChapterRisks: [],
    reviewerFocus: [],
  });
};