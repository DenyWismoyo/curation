import * as admin from "firebase-admin";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { URL } from "url";

type SourceRecord = {
  sourceId: string;
  title?: string;
  kind?: string;
  storagePath?: string;
  sourceUrl?: string;
  summaryHint?: string;
  fileName?: string;
  contentType?: string;
  extractedText?: string;
};

type ExtractedChunk = {
  chunkId: string;
  chunkIndex: number;
  text: string;
};

export type ExtractedSourcePayload = {
  previewText: string;
  extractedCharCount: number;
  extractedWordCount: number;
  chunks: ExtractedChunk[];
  extractionMode: string;
};

const URL_FETCH_TIMEOUT_MS = 12000;
const MAX_FETCHED_TEXT_CHARS = 40000;
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const collapseWhitespace = (value: string): string =>
  value
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const chunkText = (input: string, maxChars = 1800, overlap = 240): ExtractedChunk[] => {
  const paragraphs = input.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: ExtractedChunk[] = [];
  let current = "";
  let chunkIndex = 0;

  const pushChunk = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    chunks.push({
      chunkId: `chunk-${String(chunkIndex + 1).padStart(3, "0")}`,
      chunkIndex,
      text: normalized,
    });
    chunkIndex += 1;
  };

  for (const paragraph of paragraphs) {
    const nextCandidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (nextCandidate.length <= maxChars) {
      current = nextCandidate;
      continue;
    }

    if (current) {
      pushChunk(current);
      const overlapSeed = current.slice(Math.max(0, current.length - overlap)).trim();
      current = overlapSeed ? `${overlapSeed}\n\n${paragraph}` : paragraph;
      if (current.length <= maxChars) {
        continue;
      }
    }

    let remaining = paragraph;
    while (remaining.length > maxChars) {
      const slice = remaining.slice(0, maxChars);
      pushChunk(slice);
      remaining = remaining.slice(Math.max(1, maxChars - overlap)).trim();
    }
    current = remaining;
  }

  if (current) {
    pushChunk(current);
  }

  return chunks;
};

const readTextFile = (filePath: string): string => fs.readFileSync(filePath, "utf8");

const stripHtml = (html: string): string =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const isPrivateHostname = (hostname: string): boolean => {
  const value = hostname.trim().toLowerCase();
  if (!value) return true;
  if (BLOCKED_HOSTS.has(value) || value.endsWith(".local")) return true;
  if (/^10\./.test(value)) return true;
  if (/^192\.168\./.test(value)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
  if (/^169\.254\./.test(value)) return true;
  return false;
};

const fetchUrlText = async (sourceUrl: string): Promise<{ mode: string; text: string }> => {
  const parsed = new URL(sourceUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Source URL harus menggunakan http/https.");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Hostname private/local tidak diizinkan untuk source web.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "OmnifitStudyFetcher/1.0 (+https://omnifit.cloud)",
        "Accept": "text/html,text/plain,application/json,text/markdown;q=0.9,*/*;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch URL gagal dengan status ${response.status}.`);
    }

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const rawText = await response.text();
    const text = contentType.includes("html") ? stripHtml(rawText) : rawText;
    return {
      mode: contentType.includes("html") ? "url_html" : "url_text",
      text: text.slice(0, MAX_FETCHED_TEXT_CHARS),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const readSpreadsheetText = (filePath: string): string => {
  const workbook = XLSX.readFile(filePath, { dense: true });
  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return `Sheet: ${sheetName}\n${csv}`;
  }).join("\n\n");
};

const extractFileText = async (filePath: string, fileName: string, contentType: string): Promise<{ mode: string; text: string }> => {
  const ext = path.extname(fileName || "").toLowerCase();
  const normalizedType = (contentType || "").toLowerCase();

  if (normalizedType.includes("pdf") || ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdf(buffer);
    return { mode: "pdf", text: parsed.text || "" };
  }

  if (normalizedType.includes("wordprocessingml") || ext === ".docx") {
    const parsed = await mammoth.extractRawText({ path: filePath });
    return { mode: "docx", text: parsed.value || "" };
  }

  if (normalizedType.includes("spreadsheet") || normalizedType.includes("excel") || ext === ".xlsx" || ext === ".xls") {
    return { mode: "spreadsheet", text: readSpreadsheetText(filePath) };
  }

  if (
    normalizedType.startsWith("text/") ||
    [".txt", ".md", ".markdown", ".csv", ".json"].includes(ext)
  ) {
    return { mode: "text", text: readTextFile(filePath) };
  }

  return { mode: "fallback", text: "" };
};

export const extractAndChunkSource = async (
  bucket: admin.storage.Storage["bucket"] extends (...args: never[]) => infer T ? T : never,
  source: SourceRecord
): Promise<ExtractedSourcePayload> => {
  const fallbackText = collapseWhitespace([
    source.title || "",
    source.extractedText || "",
    source.summaryHint || "",
    source.sourceUrl || "",
    source.fileName || "",
  ].filter(Boolean).join("\n"));

  if (source.kind === "text_snippet") {
    const chunks = chunkText(fallbackText);
    return {
      previewText: fallbackText.slice(0, 4000),
      extractedCharCount: fallbackText.length,
      extractedWordCount: fallbackText.split(/\s+/).filter(Boolean).length,
      chunks,
      extractionMode: "text_snippet",
    };
  }

  if (source.kind === "url" && source.sourceUrl) {
    try {
      const extracted = await fetchUrlText(source.sourceUrl);
      const normalizedText = collapseWhitespace(extracted.text || fallbackText);
      const chunks = chunkText(normalizedText);

      return {
        previewText: normalizedText.slice(0, 4000),
        extractedCharCount: normalizedText.length,
        extractedWordCount: normalizedText.split(/\s+/).filter(Boolean).length,
        chunks,
        extractionMode: extracted.mode,
      };
    } catch (_error) {
      const chunks = chunkText(fallbackText);
      return {
        previewText: fallbackText.slice(0, 4000),
        extractedCharCount: fallbackText.length,
        extractedWordCount: fallbackText.split(/\s+/).filter(Boolean).length,
        chunks,
        extractionMode: "url_metadata_fallback",
      };
    }
  }

  if (!source.storagePath) {
    const chunks = chunkText(fallbackText);
    return {
      previewText: fallbackText.slice(0, 4000),
      extractedCharCount: fallbackText.length,
      extractedWordCount: fallbackText.split(/\s+/).filter(Boolean).length,
      chunks,
      extractionMode: source.kind === "url" ? "url_metadata" : "metadata_fallback",
    };
  }

  const storageFile = bucket.file(source.storagePath);
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}_${source.fileName || source.sourceId || "study_source"}`);

  try {
    await storageFile.download({ destination: tempFilePath });
    const extracted = await extractFileText(tempFilePath, source.fileName || source.storagePath, source.contentType || "");
    const normalizedText = collapseWhitespace(extracted.text || fallbackText);
    const chunks = chunkText(normalizedText);

    return {
      previewText: normalizedText.slice(0, 4000),
      extractedCharCount: normalizedText.length,
      extractedWordCount: normalizedText.split(/\s+/).filter(Boolean).length,
      chunks,
      extractionMode: extracted.mode,
    };
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (_error) {
      // ignore cleanup error
    }
  }
};