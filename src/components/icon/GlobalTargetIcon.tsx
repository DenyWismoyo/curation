import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const GlobalTargetIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Cincin Target Luar (Teal) */}
      <circle cx="50" cy="50" r="35" stroke="#299CAA" strokeWidth="6" strokeDasharray="10 6" fill="none" />
      
      {/* Titik Tengah Target (Orange) */}
      <circle cx="50" cy="50" r="10" fill="#F2673A" />
      
      {/* Anak Panah / Laju Pertumbuhan (Kuning Emas) */}
      <path 
        d="M 35 65 C 50 55 65 40 75 25 L 85 25 L 75 35 C 65 55 50 70 35 75 Z" 
        fill="#F59E38" 
      />
    </svg>
  );
};