import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { z } from "zod";

const exportSchema = z.object({
  projectId: z.string().trim().min(1),
});

const getDb = () => getFirestore(admin.app(), "curation");

export const exportStudyDocument = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
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

  const chaptersSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
  const children: any[] = [];

  // Title Page
  children.push(
    new Paragraph({
      text: projectData.title || "Study Report",
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  if (projectData.researchQuestion) {
    children.push(
      new Paragraph({
        text: "Research Question",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: projectData.researchQuestion,
        spacing: { after: 400 },
      })
    );
  }

  // Chapters
  for (const docSnap of chaptersSnap.docs) {
    const chapter = docSnap.data();
    children.push(
      new Paragraph({
        text: `Bab ${chapter.chapterNumber}: ${chapter.title}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 300 },
      })
    );

    const content = String(chapter.content || "");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: trimmed.replace("### ", ""),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmed.startsWith("## ")) {
        children.push(
          new Paragraph({
            text: trimmed.replace("## ", ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmed.startsWith("# ")) {
        children.push(
          new Paragraph({
            text: trimmed.replace("# ", ""),
            heading: HeadingLevel.HEADING_2, // Use H2 instead of H1 to not clash with chapter titles
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmed.startsWith("- ")) {
        children.push(
          new Paragraph({
            text: trimmed.replace("- ", ""),
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun(trimmed)],
            spacing: { after: 150 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
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
