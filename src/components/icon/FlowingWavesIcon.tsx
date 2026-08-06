import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const FlowingWavesIcon: React.FC<IconProps> = ({ 
  size = 64, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Ombak Teal (Utama) */}
      <path 
        d="M 10 70 C -5 50 15 20 40 25 C 60 30 65 55 90 55 C 105 55 115 45 120 35 C 105 60 80 80 50 70 C 30 65 25 45 15 50 C 12 52 13 60 10 70 Z" 
        fill="#299CAA" 
      />
      {/* Ombak Kuning (Atas) */}
      <path 
        d="M 60 30 C 80 15 100 15 120 20 C 105 25 85 25 60 30 Z" 
        fill="#F59E38" 
      />
      {/* Ombak Orange (Bawah) */}
      <path 
        d="M 85 50 C 105 40 115 45 120 60 C 110 55 95 55 85 50 Z" 
        fill="#F2673A" 
      />
      {/* Mata Node di Ombak Teal */}
      <circle cx="28" cy="38" r="3" fill="#FAFAFA" />
    </svg>
  );
};