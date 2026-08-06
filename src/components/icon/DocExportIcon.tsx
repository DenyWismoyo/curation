import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const DocExportIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Lembar Dokumen (Teal) */}
      <path d="M 30 10 L 60 10 L 80 30 L 80 85 C 80 88 78 90 75 90 L 30 90 C 27 90 25 88 25 85 L 25 15 C 25 12 27 10 30 10 Z" fill="#299CAA" />
      
      {/* Lipatan Sudut Dokumen (Kuning) */}
      <path d="M 60 10 L 60 30 L 80 30 Z" fill="#F59E38" />
      
      {/* Garis-garis Teks Abstrak (Orange) */}
      <line x1="40" y1="45" x2="65" y2="45" stroke="#F2673A" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="58" x2="70" y2="58" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="71" x2="55" y2="71" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" />
      
      {/* Spark AI Kecil di Samping */}
      <path d="M 15 35 C 18 35 20 33 20 30 C 20 33 22 35 25 35 C 22 35 20 37 20 40 C 20 37 18 35 15 35 Z" fill="#F59E38" />
    </svg>
  );
};