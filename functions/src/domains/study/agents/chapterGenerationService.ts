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

const getWritingToneInstruction = (tone: string): string => {
  switch(tone) {
    case 'hedge_fund': return 'Tulis dengan gaya bahasa profesional, tajam, kuantitatif, dan *actionable* seperti manajer hedge fund Wall Street. Fokus pada analisis risiko (downside) dan probabilitas. JANGAN HANYA MERINGKAS. Lakukan SINTESIS.';
    case 'consultative': return 'Tulis dengan gaya bahasa yang mudah dipahami, ramah, dan konsultatif, cocok untuk pembaca awam atau pemula. Hindari jargon teknis yang berlebihan tanpa penjelasan. JANGAN HANYA MERINGKAS. Lakukan SINTESIS.';
    case 'investigative': return 'Tulis dengan gaya bahasa investigatif yang mendalam, kritis, dan berani menelusuri akar masalah. JANGAN HANYA MERINGKAS. Lakukan SINTESIS.';
    case 'academic':
    default:
      return 'Tulis dengan gaya bahasa akademik, formal, profesional, mendalam, dan analitis. JANGAN HANYA MERINGKAS. Lakukan SINTESIS. Gunakan frasa transisi akademik yang elegan (contoh: "Sejalan dengan hal tersebut...", "Sebaliknya, analisis menunjukkan bahwa...").';
  }
};

export const executeStudyWriter = async (
  apiKey: string,
  projectData: any,
  chapter: ChapterRecord,
  evidenceChunks: EvidenceChunk[],
  reviewerFeedback?: string,
  crossChapterContext?: string
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
${crossChapterContext ? `\nMASTER OUTLINE (CROSS-CHAPTER AWARENESS):\nBerikut adalah rancangan keseluruhan bab di kajian ini agar Anda mengerti posisi bab ini dan menjaga benang merah (kesinambungan):\n${crossChapterContext}\n` : ''}

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

ATURAN PENULISAN (SANGAT PENTING):
1. WAJIB gunakan Markdown Headings untuk setiap bagian persis sesuai dengan penamaan dan penomoran dari Planner (misal: \`# Bab 1: Pendahuluan\`, \`## 1.1 Latar Belakang\`, \`### 1.1.1 Konteks Makro\`). JANGAN gunakan format teks biasa dengan huruf kapital semua tanpa tag markdown. Pertahankan konsistensi penomoran hierarkis.
2. ${getWritingToneInstruction(projectData.writingTone || 'academic')} (Hubungkan berbagai sumber menjadi satu argumen yang utuh).
3. Cetak tebal (**bold**) istilah-istilah atau poin-poin kunci.
4. Gunakan marker [SRC:sourceId] HANYA bila kalimat tersebut memang didukung kuat oleh bukti dari Evidence Pack. Tempatkan marker di akhir kalimat.
5. Buat isi yang sangat koheren, terstruktur dengan baik (gunakan bullet points jika perlu), dan siap diaudit. Gunakan pola argumen Claim-Evidence-Reasoning.
6. Jangan mengarang kutipan literal jika tidak ada di evidence pack.

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

TUGAS AUDITOR:
1. Nilai apakah klaim penting punya dukungan sumber nyata.
2. Deteksi teks yang dangkal, repetitif, atau hanya "copy-paste" ide tanpa sintesis/analisis. Jika dangkal, beri status NEEDS_REVIEW dan temuan severity "high".
3. Nilai konsistensi nada (sesuaikan dengan target tone: ${projectData.writingTone || 'academic'}). Tandai bahasa yang melanggar gaya penulisan yang diminta.
4. Rapikan atau tulis ulang (Revised Content) paragraf yang terlalu spekulatif atau kurang runut agar lebih padat dan sesuai target tone.

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