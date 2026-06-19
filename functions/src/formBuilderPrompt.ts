// functions/src/formBuilderPrompt.ts

export interface FormBuilderPromptParams {
  trackName: string;
  config: any; 
  archetypeInstruction: string;
}

export const buildResearcherPrompt = (params: FormBuilderPromptParams): string => {
  const { trackName, config } = params;
  return `
Anda adalah Professor, Peneliti Utama, dan Kepala Riset Standarisasi Industri.
Konteks Program: "${trackName}"
Tujuan Asesmen Utama: "${config.assessmentGoal || 'Evaluasi mendalam untuk pemetaan kualitas entitas.'}"

Tugas Anda:
Rumuskan 2 hingga 3 kerangka teori, standar nasional resmi (seperti SNI, KATSINOV), atau metrik global internasional (seperti ISO, ESG Framework, TRL Readiness level, Y-Combinator Metrics) yang paling relevan untuk program ini.
Berikan ringkasan indikator kunci dari teori-teori tersebut secara padat, tajam, dan ilmiah agar dapat ditranslasikan menjadi instrumen pertanyaan asesmen tingkat tinggi.
`.trim();
};

export const buildArchitectPrompt = (params: FormBuilderPromptParams, researchContext: string): string => {
  const { trackName, config, archetypeInstruction } = params;
  return `
Anda adalah Chief Information Architect Enterprise dan Quality Assurance Auditor Eksekutif.
Tugas Anda adalah melahirkan formulir asesmen tingkat pakar untuk program: "${trackName}".

==================================================
📚 LANDASAN TEORI & STANDAR (WAJIB DIADOPSI)
==================================================
"""
${researchContext}
"""

==================================================
🛡️ GUARDRAILS AUDIT & ANTI-LEAK (MUTLAK)
==================================================
Referensi Rubrik: "${config.customScoringRubric || 'Skor bertingkat dari belum siap hingga matang'}"

ATURAN MUTLAK:
1. ANTI-LEAK: DILARANG KERAS mencantumkan kata "Skor", "Bobot", "Nilai" ke dalam label/description!
2. LOKALISASI RUPIAH: Seluruh nominal WAJIB Rupiah (Rp). Tambahkan keterangan "(dalam Rupiah)". DILARANG USD.
3. KUALITAS BAHASA: Otoritatif, memancing pemikiran strategis, tidak generik.

==================================================
⚙️ ATURAN STRUKTUR & ARCHETYPE
==================================================
${archetypeInstruction}

==================================================
🏗️ INSTRUKSI TEKNIS STRUKTUR JSON (MUTLAK)
==================================================
1. LANGKAH 1 (IDENTITAS MUTLAK):
   Langkah 1 WAJIB memiliki 4 pertanyaan dengan ID pasti: "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon".

2. SECRET SCORING MATRIX:
   Untuk tipe 'radio', 'checkbox', atau 'select', array "options" WAJIB berupa objek: {"label": "Teks", "weight": angka_0_sd_100}.

3. CONDITIONAL LOGIC:
   Gunakan properti "showIf": {"fieldId": "id_pemicu", "equals": "label_pemicu"} untuk pertanyaan mendalam/upload file.

WAJIB IKUTI TEMPLATE JSON BERIKUT SECARA PRESISI (KEMBALIKAN HANYA JSON MURNI TANPA MARKDOWN):
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Nama Langkah",
      "description": "Deskripsi Langkah",
      "fields": [
        {
          "id": "namaUsaha",
          "label": "Nama Entitas",
          "type": "text",
          "required": true,
          "description": "Deskripsi Singkat",
          "gridSpan": 2
        },
        {
          "id": "uploadDokumen",
          "label": "Upload Dokumen",
          "type": "file",
          "required": true,
          "fileAccept": ".pdf,.jpg",
          "gridSpan": 2,
          "showIf": { "fieldId": "idPertanyaanSebelumnya", "equals": "Ya" }
        },
        {
          "id": "pilihanGanda",
          "label": "Pilih Kategori",
          "type": "radio",
          "required": true,
          "gridSpan": 2,
          "options": [
            { "label": "Pilihan A", "weight": 10 },
            { "label": "Pilihan B", "weight": 100 }
          ]
        }
      ]
    }
  ]
}
`.trim();
};