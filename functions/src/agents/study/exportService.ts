import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Document, Packer, Paragraph, HeadingLevel, TextRun, TableOfContents, Header, Footer, PageNumber, AlignmentType } from "docx";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { z } from "zod";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const exportSchema = z.object({
  projectId: z.string().trim().min(1),
});

const getDb = () => getFirestore(admin.app(), "curation");

function parseTextToRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.filter(p => p.length > 0).map(part => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part });
  });
}

export const exportStudyDocument = onCall({
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 300,
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = exportSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Payload export tidak valid.");
  }

  const uid = request.auth.uid;
  const { projectId } = parsed.data;
  
  const db = getDb();
  const projectRef = db.collection("study_projects").doc(projectId);
  const projectSnap = await projectRef.get();
  
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project tidak ditemukan.");
  }
  
  const projectData = projectSnap.data() || {};
  const memberIds = projectData.memberIds || [];
  if (!memberIds.includes(uid)) {
    throw new HttpsError("permission-denied", "Anda bukan anggota project ini.");
  }

  let chaptersSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
  let chaptersDocs = chaptersSnap.docs;

  // Check for executive summary (chapter 0)
  let execSummaryDoc = chaptersDocs.find(d => d.data().chapterNumber === 0);
  if (!execSummaryDoc) {
    const openai = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: deepseekApiKeySecret.value() });
    const allChaptersSummary = chaptersDocs.map(d => `Bab ${d.data().chapterNumber}: ${d.data().title}\n${d.data().summary || d.data().content?.substring(0, 500)}`).join('\n\n');
    
    const prompt = `Anda adalah analis eksekutif. Buatkan 'Ringkasan Eksekutif' (Executive Summary) yang profesional sepanjang 1-2 halaman berdasarkan daftar bab kajian berikut:\n\nJudul Proyek: ${projectData.title}\n${projectData.researchQuestion ? `Research Question: ${projectData.researchQuestion}\n` : ''}\nRingkasan per Bab:\n${allChaptersSummary}\n\nTulis langsung isi ringkasannya dalam format Markdown (gunakan ## untuk sub-judul jika perlu, dan paragraph biasa). Jangan gunakan judul utama '# Ringkasan Eksekutif' lagi karena akan ditambahkan secara otomatis. Gunakan gaya bahasa formal enterprise/pemerintahan.`;
    
    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }]
      });
      const generatedSummary = response.choices[0]?.message?.content || "";
      
      const newChapterRef = projectRef.collection("chapters").doc("executive-summary");
      await newChapterRef.set({
        chapterNumber: 0,
        title: "Ringkasan Eksekutif",
        content: generatedSummary,
        draftStatus: "APPROVED",
        auditStatus: "APPROVED",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Re-fetch to include the new chapter 0
      chaptersSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
      chaptersDocs = chaptersSnap.docs;
    } catch (err) {
      console.error("Failed to generate executive summary:", err);
    }
  }

  const children: any[] = [];

  // Cover Page
  children.push(
    new Paragraph({
      text: projectData.title || "Laporan Kajian",
      heading: HeadingLevel.TITLE,
      alignment: "center",
      spacing: { before: 2000, after: 400 },
    }),
    new Paragraph({
      text: "Dihasilkan secara otomatis oleh OmniFit AI",
      heading: HeadingLevel.HEADING_2,
      alignment: "center",
      spacing: { after: 1000 },
    }),
    new Paragraph({
      text: `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}`,
      alignment: "center",
      spacing: { after: 200 },
    })
  );

  if (projectData.researchQuestion) {
    children.push(
      new Paragraph({
        text: "Research Question",
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: projectData.researchQuestion,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Table of Contents
  children.push(
    new Paragraph({
      text: "Daftar Isi",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new TableOfContents("Daftar Isi", {
      hyperlink: true,
      headingStyleRange: "1-3",
    })
  );

  // Chapters
  for (const docSnap of chaptersSnap.docs) {
    const chapter = docSnap.data();
    const chapterTitleText = chapter.chapterNumber === 0 ? chapter.title : `Bab ${chapter.chapterNumber}: ${chapter.title}`;
    
    children.push(
      new Paragraph({
        text: chapterTitleText,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        alignment: AlignmentType.LEFT,
        spacing: { after: 300 },
      })
    );

    const content = String(chapter.content || "");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let isHeading = false;
      let headingLevel: any = HeadingLevel.HEADING_2;
      let text = trimmed;

      if (trimmed.startsWith("### ")) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_3;
        text = trimmed.substring(4);
      } else if (trimmed.startsWith("## ")) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_2;
        text = trimmed.substring(3);
      } else if (trimmed.startsWith("# ")) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_2; // Use H2 instead of H1 to not clash with chapter titles
        text = trimmed.substring(2);
      } else if (/^Bab \d+[:.]?/i.test(trimmed)) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_2;
        text = trimmed;
      } else if (/^\d+\.\d+\.\d+\s/.test(trimmed)) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_3;
        text = trimmed;
      } else if (/^\d+\.\d+\s/.test(trimmed)) {
        isHeading = true;
        headingLevel = HeadingLevel.HEADING_2;
        text = trimmed;
      }

      if (isHeading) {
        children.push(
          new Paragraph({
            text: text,
            heading: headingLevel,
            alignment: AlignmentType.LEFT,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmed.startsWith("- ")) {
        children.push(
          new Paragraph({
            children: parseTextToRuns(trimmed.replace("- ", "")),
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 150, line: 360 }, // 1.5 line spacing
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: parseTextToRuns(trimmed),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 150, line: 360 }, // 1.5 line spacing
          })
        );
      }
    }
  }

  // Daftar Pustaka (References)
  const allCitations: any[] = [];
  chaptersSnap.docs.forEach((docSnap) => {
    const chapter = docSnap.data();
    if (Array.isArray(chapter.citations)) {
      allCitations.push(...chapter.citations);
    }
  });

  const uniqueSourceIds = [...new Set(allCitations.map(cit => cit.sourceId).filter(Boolean))];

  if (uniqueSourceIds.length > 0) {
    const sourcesSnap = await projectRef.collection("sources").get();
    const sourceMap = new Map<string, any>();
    sourcesSnap.docs.forEach(doc => {
      sourceMap.set(doc.id, doc.data());
    });

    children.push(
      new Paragraph({
        text: "Daftar Pustaka",
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 400, after: 300 },
      })
    );

    // Format APA style-like entries
    uniqueSourceIds.forEach((sourceId) => {
      const sourceData = sourceMap.get(sourceId);
      if (sourceData) {
        const title = sourceData.title || "Sumber Tidak Diketahui";
        const kindText = sourceData.kind === "url" ? "[Website]" : (sourceData.kind === "text_snippet" ? "[Catatan]" : "[Dokumen]");
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: title, italics: true }),
              new TextRun(` ${kindText}. Diunduh dari sistem pangkalan data (Knowledge Base) proyek ini.`),
            ],
            spacing: { after: 150 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            pageNumbers: {
              start: 1,
              formatType: "decimal",
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: projectData.title || "Laporan Kajian",
                    color: "666666",
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Halaman ",
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: "666666",
                  }),
                  new TextRun({
                    text: " dari ",
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    
    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `exports/study_${projectId}_${Date.now()}.docx`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      metadata: {
        cacheControl: "public, max-age=31536000",
      }
    });

    // Make public and get URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return {
      success: true,
      downloadUrl: publicUrl,
    };
  } catch (error: any) {
    console.error("exportStudyDocument error:", error);
    throw new HttpsError("internal", error?.message || "Gagal melakukan export dokumen.");
  }
});
