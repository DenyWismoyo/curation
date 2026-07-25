// src/components/domain/public/ScoreLineChart.tsx
/**
 * Mini SVG line chart untuk menampilkan tren skor asesmen.
 * Diekstrak dari progress/page.tsx.
 */

interface ScoreLineChartProps {
  scores: number[];
  width?: number;
  height?: number;
}

export function ScoreLineChart({ scores, width = 280, height = 80 }: ScoreLineChartProps) {
  if (scores.length < 2) return null;

  const PAD = 10;
  const minS = Math.max(0, Math.min(...scores) - 10);
  const maxS = Math.min(100, Math.max(...scores) + 10);
  const range = maxS - minS || 1;

  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (width - PAD * 2);
    const y = height - PAD - ((s - minS) / range) * (height - PAD * 2);
    return `${x},${y}`;
  });

  const firstPt = pts[0].split(',');
  const lastPt = pts[pts.length - 1].split(',');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-20"
      preserveAspectRatio="none"
    >
      {/* Fill area */}
      <path
        d={`M ${pts.join(' L ')} L ${lastPt[0]},${height - PAD} L ${firstPt[0]},${height - PAD} Z`}
        fill="url(#scoreGrad)"
        opacity="0.3"
      />
      {/* Line */}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#4F46E5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',');
        return (
          <circle key={i} cx={x} cy={y} r="4" fill="#4F46E5" stroke="white" strokeWidth="2" />
        );
      })}
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
