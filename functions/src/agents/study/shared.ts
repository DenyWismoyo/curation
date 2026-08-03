export type StudySource = {
  sourceId: string;
  title: string;
  kind: string;
  fileName?: string;
  sourceUrl?: string;
  summaryHint?: string;
  contentType?: string;
  storagePath?: string;
  extractedText?: string;
  extractedCharCount?: number;
  chunkCount?: number;
};

export type StudyChapterPlan = {
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

export type StudyEvidenceChunk = {
  sourceId: string;
  chunkIndex: number;
  textChunk: string;
};

export const dedupeSourceIds = (values: string[]): string[] =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

export const safeJsonParse = <T>(rawText: string, fallback: T): T => {
  try {
    const clean = rawText.trim().replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
    return JSON.parse(clean) as T;
  } catch (_error) {
    return fallback;
  }
};