// src/data/templateform.ts

export interface FormArchetype {
  id: string;
  name: string;
  description: string;
  aiInstruction: string;
}

export const FORM_ARCHETYPES: FormArchetype[] = [
  {
    id: 'hybrid-assessment',
    name: 'Asesmen Hybrid (Kombinasi Umum)',
    description: 'Kombinasi input angka, isian teks, dan beberapa upload file krusial.',
    aiInstruction: 'Gunakan kombinasi input yang seimbang. Gunakan "select" atau "radio" untuk klasifikasi. Gunakan "number" untuk metrik angka. Gunakan "file" HANYA untuk dokumen bukti yang mutlak diperlukan.'
  },
  {
    id: 'strict-audit',
    name: 'Audit Ketat (Validasi Bukti Fisik)',
    description: 'Setiap klaim data wajib disertai dengan upload dokumen/bukti fisik.',
    aiInstruction: 'Ini adalah formulir AUDIT KETAT. Terapkan validasi silang secara agresif. Setiap kali meminta klaim angka (number) atau pencapaian besar, WAJIB diikuti dengan input tipe "file" (seperti Laporan/Foto).'
  },
  {
    id: 'quick-survey',
    name: 'Survei Cepat (Tanpa Upload File)',
    description: 'Formulir ringan berbasis pilihan ganda untuk pengisian cepat.',
    aiInstruction: 'Ini adalah SURVEI CEPAT. DILARANG KERAS menggunakan tipe input "file" atau "textarea" yang terlalu banyak. Maksimalkan "radio", "checkbox", dan "select" agar bisa diisi dengan cepat.'
  },
  {
    id: 'psychometric-scale',
    name: 'Skala Psikometrik / Kematangan',
    description: 'Fokus pada pengukuran level kematangan dengan opsi jawaban bertingkat.',
    aiInstruction: 'Ini adalah instrumen PENGUKURAN KEMATANGAN. Setiap pertanyaan WAJIB menggunakan tipe "radio" atau "select" dengan opsi jawaban bertingkat (dari level sangat buruk hingga sangat baik). Buat opsi jawaban yang deskriptif.'
  }
];