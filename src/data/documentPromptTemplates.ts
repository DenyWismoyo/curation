// src/data/documentPromptTemplates.ts

export interface DocumentPreset {
  id: string;
  name: string;
  iconType: 'finance' | 'briefcase' | 'building';
  prompt: string;
}

export const DocumentPresets: DocumentPreset[] = [
  {
    id: 'doc-proposal-investor',
    name: 'Pitch Deck / Proposal Investor',
    iconType: 'briefcase',
    prompt: `Berdasarkan data profil entitas dan hasil analisis AI (SWOT, Metrik, Risiko) yang dilampirkan, buatkan draf Proposal Investor (Business Plan) yang sangat profesional dan komprehensif.
    Struktur wajib:
    1. Ringkasan Eksekutif
    2. Latar Belakang & Masalah
    3. Solusi & Keunggulan Kompetitif (Ambil dari data Strengths)
    4. Target Pasar & Peluang (Ambil dari data Opportunities)
    5. Mitigasi Risiko (Ambil dari Risk Assessment)
    6. Rencana Penggunaan Dana (Action Plan / Roadmap)
    Gaya bahasa: Persuasif, optimis, elegan, dan formal khas konsultan bisnis.`
  },
  {
    id: 'doc-pengajuan-kredit',
    name: 'Proposal Pengajuan Kredit Bank / KUR',
    iconType: 'finance',
    prompt: `Berdasarkan data profil entitas dan hasil analisis AI yang dilampirkan, buatkan draf Proposal Pengajuan Pembiayaan/Kredit Bank. 
    Fokuskan narasi pada:
    1. Profil Usaha & Legalitas
    2. Kapasitas Pembayaran & Kesehatan Finansial
    3. Analisis Kelayakan 5C (Character, Capacity, Capital, Collateral, Condition)
    4. Mitigasi Risiko Usaha
    5. Tujuan Penggunaan Dana.
    Gaya bahasa: Kaku, formal perbankan, sangat objektif, dan berfokus pada mitigasi risiko.`
  },
  {
    id: 'doc-profil-perusahaan',
    name: 'Company Profile Naratif',
    iconType: 'building',
    prompt: `Tuliskan narasi Company Profile yang elegan, menjual, dan siap cetak untuk entitas bisnis berdasarkan data profil yang dilampirkan.
    Struktur wajib:
    1. Tentang Kami (Sejarah & Visi Misi)
    2. Layanan / Produk Unggulan
    3. Keunggulan Kompetitif (Value Proposition)
    4. Rencana Masa Depan.
    Gaya bahasa: Puitis bisnis (corporate storytelling), meyakinkan, dan profesional.`
  }
];