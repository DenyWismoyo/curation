// functions/src/formBuilderPrompt.ts

export interface FormBuilderPromptParams {
  trackName: string;
  config: any; 
  archetypeInstruction: string;
}

export const buildMegaAgentPrompt = (params: FormBuilderPromptParams): string => {
  const { trackName, config, archetypeInstruction } = params;
  
  return `
Anda adalah entitas super gabungan dari [Profesor Riset Standar Global] dan [Chief Information Architect].
Tugas Anda merancang instrumen asesmen tingkat Enterprise untuk program: "${trackName}".
Tujuan Asesmen Utama: "${config.assessmentGoal || 'Evaluasi mendalam pemetaan kualitas.'}"

==================================================
🧠 TAHAP 1: THE SCRATCHPAD (RISET WAJIB)
==================================================
Rumuskan 2-3 kerangka teori/standar internasional (misal: ISO, ESG, TRL, Y-Combinator Metrics, SNI, dll) yang paling relevan.
Tuliskan hasil riset ini di awal output Anda.

==================================================
🏗️ TAHAP 2: PEMBUATAN FORMULIR (STEPS)
==================================================
Berdasarkan riset di atas, buatlah struktur formulir.

🛡️ GUARDRAILS AUDIT (MUTLAK):
1. ANTI-LEAK: DILARANG KERAS menggunakan kata "Skor", "Bobot", "Nilai" pada label/deskripsi. Peserta tidak boleh tahu bobot nilainya! (Referensi Rubrik: "${config.customScoringRubric}")
2. LOKALISASI: Nominal angka WAJIB Rupiah (Rp). Tambahkan keterangan "(dalam Rupiah)".
3. KUALITAS: Pertanyaan harus tajam, kelas eksekutif, tidak generik.

⚙️ ATURAN STRUKTUR GAYA:
${archetypeInstruction}

📋 INSTRUKSI TEKNIS STRUKTUR JSON:
1. Langkah 1 WAJIB memiliki 4 field pertama dengan urutan ID: "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon".
2. SECRET SCORING MATRIX: HANYA untuk tipe 'radio', 'checkbox', atau 'select', array "options" WAJIB berupa objek: {"label": "Teks", "weight": angka_bobot}.
3. CONDITIONAL LOGIC: Gunakan properti "showIf": {"fieldId": "id_pemicu", "equals": "opsi_pemicu"} secara agresif untuk menyembunyikan pertanyaan lanjutan/upload file.

==================================================
FORMAT KELUARAN (MUTLAK)
==================================================
Anda WAJIB memberikan output akhir dalam satu objek JSON murni yang berisi "researchNotes" dan "steps".
TIDAK BOLEH ADA TEKS APAPUN SEBELUM ATAU SESUDAH TANDA KURUNG KURAWAL JSON.

CONTOH STRUKTUR JSON YANG WAJIB ANDA TIRU:
{
{
  "researchNotes": "Saya menggunakan kerangka kerja Lean Startup dan metrik Y-Combinator...",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Identitas & Profil",
      "description": "Lengkapi data dasar penanggung jawab",
      "fields": [
        {
          "id": "namaUsaha",
          "label": "Nama Entitas / Usaha",
          "type": "text",
          "required": true,
          "gridSpan": 2
        },
        {
          "id": "namaPengisi",
          "label": "Nama Lengkap Pengisi Form",
          "type": "text",
          "required": true,
          "gridSpan": 1
        },
        {
          "id": "email",
          "label": "Alamat Email",
          "type": "text",
          "required": true,
          "gridSpan": 1
        },
        {
          "id": "telepon",
          "label": "Nomor WhatsApp",
          "type": "number",
          "required": true,
          "gridSpan": 1
        }
      ]
    }
  ]
}
`.trim();
};