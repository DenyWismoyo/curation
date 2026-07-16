import React from 'react';
import { IconProps } from '@/types/curation';

export const AdminShieldIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Bentuk Dasar Perisai */}
      <path 
        d="M 50 10 L 85 25 L 85 55 C 85 75 50 90 50 90 C 50 90 15 75 15 55 L 15 25 Z" 
        fill="#299CAA" 
      />
      {/* Highlight Lapisan Dalam */}
      <path 
        d="M 50 20 L 75 32 L 75 53 C 75 68 50 80 50 80 C 50 80 25 68 25 53 L 25 32 Z" 
        fill="#1D7B87" 
      />
      {/* Node Sirkuit Tengah (Kuning & Orange) */}
      <circle cx="50" cy="45" r="8" fill="#F59E38" />
      <path d="M 50 53 L 50 65" stroke="#F2673A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="68" r="3" fill="#F2673A" />
    </svg>
  );
};