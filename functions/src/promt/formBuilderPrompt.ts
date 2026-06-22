// functions/src/promt/formBuilderPrompt.ts

export interface FormBuilderPromptParams {
  trackName: string;
  config: any; 
  archetypeInstruction: string;
}

export const buildMegaAgentPrompt = (params: FormBuilderPromptParams): string => {
  const { trackName, config, archetypeInstruction } = params;
  
  const metrics = config.expectedMetrics?.join(', ') || 'Metrik standar kelayakan bisnis';
  const analysisBlocks = config.expectedAnalysisBlocks?.join(' | ') || '';
  const risks = config.riskFramework || 'Deteksi potensi kegagalan operasional';
  const sources = config.researchSourcesCited?.join(', ') || 'Standar industri global terbaik';

  return `
Anda adalah entitas super gabungan dari [Profesor Riset Standar Global] dan [Chief Information Architect].
Tugas Anda merancang instrumen asesmen tingkat Enterprise untuk program: "${trackName}".

Tujuan Asesmen Utama: "${config.assessmentGoal || 'Evaluasi mendalam pemetaan kualitas.'}"
Target Metrik Radar yang Harus Diukur: [${metrics}]
Fokus Blok Analisis: [${analysisBlocks}]
Fokus Deteksi Risiko (Red Flags): [${risks}]
Standar Referensi Kredibel yang Wajib Diadopsi: [${sources}]

==================================================
🧠 TAHAP 1: THE SCRATCHPAD (RISET & PEMETAAN WAJIB)
==================================================
Lakukan penelusuran (Search Grounding) terhadap standar referensi di atas.
Anda WAJIB memastikan bahwa SETIAP "Target Metrik Radar" dan "Fokus Deteksi Risiko" yang disebutkan di atas memiliki MINIMAL 1 hingga 2 pertanyaan spesifik di dalam formulir. 

==================================================
🏗️ TAHAP 2: PEMBUATAN FORMULIR (STEPS)
==================================================
Berdasarkan pemetaan di atas, buatlah struktur formulir secara presisi.

🛡️ GUARDRAILS AUDIT (MUTLAK):
1. ANTI-LEAK: DILARANG menggunakan kata "Skor", "Bobot", "Nilai" pada label/deskripsi. 
2. LOKALISASI BAHASA: Seluruh teks, label pertanyaan, deskripsi, hingga opsi jawaban WAJIB MENGGUNAKAN BAHASA INDONESIA YANG FORMAL DAN MUDAH DIPAHAMI. Nominal angka WAJIB menggunakan mata uang Rupiah (Rp).
3. JSON STRING SAFETY: DILARANG KERAS menggunakan ENTER atau NEWLINE harfiah (\\n) di dalam teks value JSON. Gunakan spasi biasa untuk memisahkan kalimat.

⚙️ ATURAN STRUKTUR & GAYA (ARCHETYPE):
${archetypeInstruction}

📋 INSTRUKSI TEKNIS STRUKTUR JSON:
1. Langkah 1 WAJIB memiliki 4 field pertama dengan urutan ID: "namaUsaha", "namaPengisi", "emailAktif", "nomorTelepon".
2. Tipe "type" yang valid HANYA: "text", "textarea", "number", "date", "select", "radio", "checkbox", "file".
3. SECRET SCORING MATRIX: Untuk tipe 'radio', 'checkbox', atau 'select', array "options" WAJIB berupa objek: {"label": "Teks", "weight": angka_bobot_0_hingga_100}. Berikan bobot yang selaras dengan Rubrik Klien berikut: "${config.customScoringRubric}".
4. CONDITIONAL LOGIC: Gunakan properti "showIf": {"fieldId": "id_pemicu", "equals": "opsi_pemicu"} secara agresif untuk mendalami pemicu Red Flags dari fokus risiko di atas.
5. BATAS OUTPUT: Maksimal 30-35 pertanyaan total agar sistem tidak terputus.

==================================================
FORMAT KELUARAN (MUTLAK)
==================================================
Keluarkan HANYA format JSON murni TANPA markdown block, TANPA teks pengantar apapun.
Tiru persis struktur JSON berikut:

{
  "researchNotes": "Tuliskan ringkasan riset dalam satu paragraf lurus menggunakan Bahasa Indonesia tanpa enter.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Identitas Dasar",
      "description": "Lengkapi data dasar penanggung jawab",
      "fields": [
        {
          "id": "namaUsaha", "label": "Nama Entitas", "type": "text", "required": true, "gridSpan": 2
        }
      ]
    }
  ]
}
`.trim();
};