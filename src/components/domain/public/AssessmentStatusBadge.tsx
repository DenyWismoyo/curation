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
  COMPLETED:        { label: 'Selesai',       className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100' },
  ANALYZING_MASTER: { label: 'Menganalisis',  className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100' },
  ANALYZING_METRICS:{ label: 'Menganalisis',  className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100' },
  PLANNING_ACTION:  { label: 'Merencanakan',  className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-100' },
  GENERATING_ASSETS:{ label: 'Finalisasi',    className: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-100' },
  FAILED:           { label: 'Gagal',         className: 'bg-red-50 text-red-700 border-red-100' },
  PENDING:          { label: 'Menunggu',      className: 'bg-muted text-muted-foreground text-muted-foreground border-border' },
};

export function AssessmentStatusBadge({ status, className = '' }: AssessmentStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-muted text-muted-foreground text-muted-foreground border-border' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
