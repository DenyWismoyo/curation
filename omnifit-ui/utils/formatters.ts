import { OmnifitColor } from '../tokens/colors';

/**
 * Format score to string with standard formatting.
 * Example: formatScore(78, 100) -> "78/100 (78%)"
 */
export function formatScore(score: number, max: number = 100): string {
  if (isNaN(score) || isNaN(max) || max === 0) return '0/0 (0%)';
  const percentage = Math.round((score / max) * 100);
  return `${score}/${max} (${percentage}%)`;
}

/**
 * Format number to currency.
 * Example: formatCurrency(1500000) -> "Rp 1.500.000"
 */
export function formatCurrency(
  value: number, 
  currency: 'IDR' | 'USD' = 'IDR', 
  options?: Intl.NumberFormatOptions
): string {
  if (isNaN(value)) return '0';
  
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    ...options,
  }).format(value);
}

/**
 * Format date to relative time.
 * Example: "2 hours ago", "yesterday", "2 days ago"
 */
export function formatRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  // If older than a week, return actual date
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }).format(date);
}

/**
 * Get color token based on score percentage.
 * Thresholds: >= 70% (emerald), >= 40% (amber), < 40% (rose)
 */
export function getScoreColor(score: number, max: number = 100): OmnifitColor {
  if (isNaN(score) || isNaN(max) || max === 0) return 'slate';
  
  const percentage = (score / max) * 100;
  
  if (percentage >= 70) return 'emerald';
  if (percentage >= 40) return 'amber';
  return 'rose';
}

/**
 * Generate a canvas linear gradient based on OmnifitColor.
 * Useful for Chart.js or HTML Canvas visualizations.
 */
export function generateChartGradient(
  ctx: CanvasRenderingContext2D, 
  color: OmnifitColor,
  height: number = 400
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  
  // Color hex codes matched with Tailwind config
  const colorMap: Record<OmnifitColor, { top: string; bottom: string }> = {
    indigo: { top: 'rgba(99, 102, 241, 0.5)', bottom: 'rgba(99, 102, 241, 0.0)' },
    amber: { top: 'rgba(245, 158, 11, 0.5)', bottom: 'rgba(245, 158, 11, 0.0)' },
    emerald: { top: 'rgba(16, 185, 129, 0.5)', bottom: 'rgba(16, 185, 129, 0.0)' },
    rose: { top: 'rgba(244, 63, 94, 0.5)', bottom: 'rgba(244, 63, 94, 0.0)' },
    slate: { top: 'rgba(148, 163, 184, 0.5)', bottom: 'rgba(148, 163, 184, 0.0)' }
  };
  
  const selectedColor = colorMap[color] || colorMap.indigo;
  
  gradient.addColorStop(0, selectedColor.top);
  gradient.addColorStop(1, selectedColor.bottom);
  
  return gradient;
}
