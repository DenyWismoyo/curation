import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const AILensIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Kelopak Mata Organik (Teal) */}
      <path 
        d="M 10 50 C 30 20 70 20 90 50 C 70 80 30 80 10 50 Z" 
        stroke="#299CAA" 
        strokeWidth="6" 
        fill="none" 
      />
      
      {/* Iris Lensa (Kuning) */}
      <circle cx="50" cy="50" r="20" stroke="#F59E38" strokeWidth="5" fill="none" />
      
      {/* Pupil AI Inti (Orange) */}
      <circle cx="50" cy="50" r="10" fill="#F2673A" />
      
      {/* Detail Cahaya (Garis Digital) */}
      <path d="M 50 20 L 50 25 M 50 75 L 50 80 M 20 50 L 25 50 M 75 50 L 80 50" stroke="#299CAA" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};