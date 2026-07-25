// src/components/domain/public/AssessmentStatusBadge.tsx
/**
 * Badge status asesmen yang konsisten di seluruh public area.
 * Digunakan di dashboard, progress, profil.
 */

interface AssessmentStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  COMPLETED:        { label: 'Selesai',       className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ANALYZING_MASTER: { label: 'Menganalisis',  className: 'bg-amber-50 text-amber-700 border-amber-100' },
  ANALYZING_METRICS:{ label: 'Menganalisis',  className: 'bg-amber-50 text-amber-700 border-amber-100' },
  PLANNING_ACTION:  { label: 'Merencanakan',  className: 'bg-blue-50 text-blue-700 border-blue-100' },
  GENERATING_ASSETS:{ label: 'Finalisasi',    className: 'bg-purple-50 text-purple-700 border-purple-100' },
  FAILED:           { label: 'Gagal',         className: 'bg-red-50 text-red-700 border-red-100' },
  PENDING:          { label: 'Menunggu',      className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function AssessmentStatusBadge({ status, className = '' }: AssessmentStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
