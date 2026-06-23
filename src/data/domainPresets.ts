// src/data/domainPresets.ts
import { FormDomainPurpose, CustomUiLabels } from '@/types/curation';

export interface DomainPreset {
  id: string;
  name: string;
  description: string;
  formPurpose: FormDomainPurpose;
  customUiLabels: CustomUiLabels;
}

export const DomainPresets: DomainPreset[] = [
  {
    id: "assessment",
    name: "Asesmen / Audit / Due Diligence Kompetensi",
    description: "Standar evaluasi kuantitatif, audit kelayakan, atau pengukuran mutu.",
    formPurpose: "assessment",
    customUiLabels: {
      scoreLabel: "AI Readiness Score",
      swotLabel: "Capability Matrix (SWOT)",
      riskLabel: "Critical Risks & Mitigation Map",
      roadmapLabel: "Rekomendasi Strategis",
      executionLabel: "Action Plan Timeline"
    }
  },
  {
    id: "counseling",
    name: "Konseling / HR / Pemetaan Psikologi & Karier",
    description: "Pendekatan suportif untuk evaluasi mental, karakter, dan kecocokan tim.",
    formPurpose: "counseling",
    customUiLabels: {
      scoreLabel: "Indeks Profil & Stabilitas",
      swotLabel: "Pemetaan Karakter & Perilaku (SWOT)",
      riskLabel: "Pemicu Konflik & Strategi Pendampingan",
      roadmapLabel: "Rekomendasi Rencana Pengembangan",
      executionLabel: "Timeline Sesi Konseling & Intervensi"
    }
  },
  {
    id: "monitoring",
    name: "Monitoring Progres / Evaluasi Capaian Kerja",
    description: "Pemantauan proyek (Monev), pelacakan target KPI, dan evaluasi kontraktor.",
    formPurpose: "monitoring",
    customUiLabels: {
      scoreLabel: "Persentase Capaian Target (KPI)",
      swotLabel: "Matriks Kondisi Lapangan (SWOT)",
      riskLabel: "Hambatan Kritis Proyek & Mitigasi",
      roadmapLabel: "Rencana Aksi Korektif Strategis",
      executionLabel: "Timeline Kejar Tayang (Sprint)"
    }
  },
  {
    id: "consultation",
    name: "Konsultasi Pakar / Pemecahan Masalah / Strategi",
    description: "Tanya jawab hukum, medis dasar, IT, atau solusi strategis bisnis.",
    formPurpose: "consultation",
    customUiLabels: {
      scoreLabel: "Tingkat Urgensi Solusi",
      swotLabel: "Matriks Pemecahan Masalah",
      riskLabel: "Potensi Risiko Lanjutan & Pencegahan",
      roadmapLabel: "Opsi Solusi Pakar (Rekomendasi)",
      executionLabel: "Langkah Eksekusi Solusi"
    }
  }
];