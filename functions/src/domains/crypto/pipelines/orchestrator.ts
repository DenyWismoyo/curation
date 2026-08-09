import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const getDb = () => getFirestore(admin.app(), "curation");

export const runCryptoAcademyPipeline = onDocumentUpdated({
  document: "cryptoEducation/{moduleId}",
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret],
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  const prevStatus = before.refactorStatus || "IDLE";
  const newStatus = after.refactorStatus || "IDLE";
  
  if (prevStatus === newStatus) return;

  const moduleId = event.params.moduleId;
  const db = getDb();
  const moduleRef = db.collection("cryptoEducation").doc(moduleId);
  
  const apiKey = deepseekApiKeySecret.value();
  if (!apiKey) {
    console.error("API Key DeepSeek tidak dikonfigurasi.");
    return;
  }
  const deepseekClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: apiKey });

  try {
    if (newStatus === "INDEXING_RESEARCH") {
      // AGENT 1: The Researcher
      const currentContent = after.content || "";
      const studyProjectId = after.studyProjectId;
      const studyChapterId = after.studyChapterId;
      
      let studyContext = "";
      if (studyProjectId && studyChapterId) {
         const chapterSnap = await db.collection("study_projects").doc(studyProjectId).collection("chapters").doc(studyChapterId).get();
         if (chapterSnap.exists) {
             studyContext = chapterSnap.data()?.content || ""; 
         }
      }

      const prompt = `Anda adalah "Elite Data Researcher" untuk Crypto Academy.
Tugas Anda adalah membaca KONTEN SAAT INI dan KAJIAN ASLI, kemudian menghasilkan FACT SHEET (Lembar Fakta) yang terstruktur. 
Pastikan tidak ada data penting yang tertinggal.

KONTEN SAAT INI:
"""
${currentContent}
"""

KAJIAN ASLI:
"""
${studyContext.substring(0, 15000)}
"""

INSTRUKSI:
Ekstrak poin-poin penting, metrik, angka, dan konsep utama menjadi sebuah daftar ringkas namun padat informasi. Hasilkan teks murni.`;

      const result = await deepseekClient.chat.completions.create({
         model: "deepseek-chat", // Gunakan model chat yang lebih cepat untuk ekstraksi
         messages: [{ role: "user", content: prompt }]
      });
      
      const researchFactSheet = result.choices[0].message.content || "";

      await moduleRef.update({
        refactorStatus: "WRITING",
        researchFactSheet: researchFactSheet,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } 
    else if (newStatus === "WRITING") {
      // AGENT 2: The Master Copywriter
      const factSheet = after.researchFactSheet || "";
      
      const prompt = `Anda adalah "Elite Crypto Copywriter" kelas dunia. Gaya penulisan Anda selevel dengan Binance Academy Premium atau kursus berbayar Masterclass.
Tugas Anda adalah merangkai narasi edukasi yang SANGAT MENARIK (engaging), memiliki "Hook" yang kuat, dan menggunakan analogi dunia nyata yang mudah dicerna.

FAKTA YANG HARUS DILIPUT (Dari Researcher):
"""
${factSheet}
"""

INSTRUKSI COPYWRITING PREMIUM:
1. **The Hook**: Awali artikel dengan pembukaan yang memancing rasa penasaran (misal: studi kasus nyata, pertanyaan provokatif, atau mematahkan miskonsepsi umum). Jangan pernah mulai dengan definisi kaku "X adalah...".
2. **Struktur Visual (Micro-formatting)**: 
   - Gunakan judul Sub-Bab (H2, H3) yang bergaya "artikel populer" dilengkapi 1 emoji relevan (misal: "### 🏦 Mengapa Bank Gagal?").
   - Hindari format makalah akademis (Bab 1, 1.1).
   - Gunakan **bold** untuk istilah penting, dan *bullet points* agar materi mudah di-scan secara visual. Jangan buat paragraf tembok (wall of text).
3. **Analogi Emas**: Wajib gunakan minimal 1-2 analogi dunia nyata yang brilian untuk menjelaskan konsep teknis yang sulit.
4. **KOTAK ALERT KHUSUS**:
   - Di awal (setelah hook/paragraf pertama): \`> 📝 **TL;DR:** [Rangkuman inti materi dalam 2 kalimat]\`
   - Di tengah/materi kunci: \`> 💡 **PRO TIP:** [Tips praktis atau insight mahal]\`
   - (Opsional) Jika ada peringatan risiko: \`> ⚠️ **DANGER ZONE:** [Risiko yang harus dihindari trader]\`
5. HANYA kembalikan teks hasil akhir dalam format Markdown murni.`;

      const result = await deepseekClient.chat.completions.create({
         model: "deepseek-reasoner", // V4 Pro
         messages: [{ role: "user", content: prompt }]
      });
      
      let draftContent = result.choices[0].message.content || "";
      draftContent = draftContent.replace(/^```markdown\n/, "").replace(/```$/, "").trim();

      await moduleRef.update({
        refactorStatus: "EDITING",
        refactoredContentDraft: draftContent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    else if (newStatus === "EDITING") {
      // AGENT 3: The Fact-Checker & Editor
      const draftContent = after.refactoredContentDraft || "";
      const factSheet = after.researchFactSheet || "";
      
      const prompt = `Anda adalah "Editor in Chief" & "Fact-Checker" untuk Crypto Academy.
Tugas Anda adalah menyempurnakan draft tulisan Copywriter, memastikan akurasi mutlak, dan menambahkan Glosarium Interaktif (Tagging).

FAKTA ASLI (Sebagai Acuan Akurasi):
"""
${factSheet}
"""

DRAFT COPYWRITER (Untuk Diedit):
"""
${draftContent}
"""

INSTRUKSI KUALITAS (QUALITY CONTROL):
1. **Fact-Checking**: Pastikan isi draft tidak melenceng dari FAKTA ASLI (No Hallucination). Jangan mengubah gaya bahasanya yang sudah menarik, hanya perbaiki jika ada klaim angka/fakta yang salah.
2. **Pengamanan Markdown**: Pastikan sintaks Markdown rapi, kotak alert (\`> 📝 **TL;DR:**\` dsb) utuh dan tidak rusak.
3. **GLOSARIUM INTERAKTIF (WAJIB)**: Cari minimal 3-5 istilah teknis kripto. WAJIB bungkus istilah tersebut beserta penjelasan singkatnya dalam format: \`[[Istilah::Penjelasan singkat maksimal 15 kata]]\`.
4. **Judul & Deskripsi**: Buat sebuah Judul Modul yang sangat memikat (catchy) dan Deskripsi Singkat (snippet) maksimal 200 karakter yang menjual.
5. **FORMAT OUTPUT WAJIB**: Anda HARUS mengembalikan output dalam format tag XML berikut (tanpa blok kode markdown di luarnya):

<title>Judul yang Memikat (Maks 10 kata)</title>
<description>Deskripsi singkat yang menjual (Maks 200 karakter)</description>
<content>
(Isi artikel markdown yang sudah diedit)
</content>`;

      const result = await deepseekClient.chat.completions.create({
         model: "deepseek-reasoner", // V4 Pro
         messages: [{ role: "user", content: prompt }]
      });
      
      let rawOutput = result.choices[0].message.content || "";
      rawOutput = rawOutput.replace(/^```(xml|markdown)?\n/, "").replace(/```$/, "").trim();

      const titleMatch = rawOutput.match(/<title>([\s\S]*?)<\/title>/i);
      const descMatch = rawOutput.match(/<description>([\s\S]*?)<\/description>/i);
      const contentMatch = rawOutput.match(/<content>([\s\S]*?)<\/content>/i);

      const refactoredTitle = titleMatch ? titleMatch[1].trim() : "";
      const refactoredDescription = descMatch ? descMatch[1].trim() : "";
      const finalContent = contentMatch ? contentMatch[1].trim() : rawOutput;

      await moduleRef.update({
        refactorStatus: "COMPLETED",
        refactoredContent: finalContent,
        refactoredTitle: refactoredTitle,
        refactoredDescription: refactoredDescription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`Error in Pipeline (Status: ${newStatus}):`, error);
    await moduleRef.update({
      refactorStatus: "FAILED",
      refactorError: String(error),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
