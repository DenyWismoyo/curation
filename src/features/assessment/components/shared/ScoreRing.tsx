import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function ScoreRing({ score, size = 100, strokeWidth = 8, label, className = '' }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-indigo-500';
  let gradientId = 'scoreGradient-indigo';
  
  if (score >= 80) {
    colorClass = 'text-emerald-500';
    gradientId = 'scoreGradient-emerald';
  } else if (score >= 60) {
    colorClass = 'text-amber-500';
    gradientId = 'scoreGradient-amber';
  } else if (score > 0) {
    colorClass = 'text-rose-500';
    gradientId = 'scoreGradient-rose';
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="scoreGradient-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="scoreGradient-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="scoreGradient-rose" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="scoreGradient-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <circle 
          cx={size / 2} cy={size / 2} r={radius} 
          fill="none" stroke="currentColor" 
          strokeWidth={strokeWidth} 
          className="text-muted/30 dark:text-white/10" 
        />
        <circle 
          cx={size / 2} cy={size / 2} r={radius} 
          fill="none" 
          stroke={`url(#${gradientId})`} 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black ${colorClass}`}>{score}</span>
        {label && <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{label}</span>}
      </div>
    </div>
  );
}
