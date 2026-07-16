import React from 'react';
import { IconProps } from '@/types/curation';

export const TechCardIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background Kotak dengan Sudut Tumpul Halus */}
      <rect width="100" height="100" rx="24" fill="none" />
      
      {/* Sisi Kiri - Teal/Cyan dengan Lekukan Dinamis */}
      <path 
        d="M 45 0 L 0 0 L 0 100 L 30 100 C 50 70 35 30 45 0 Z" 
        fill="#299CAA" 
      />
      
      {/* Sisi Kanan - Orange */}
      <path 
        d="M 45 0 C 35 30 50 70 30 100 L 100 100 L 100 0 Z" 
        fill="#F2673A" 
      />
      
      {/* Mini Hexagon di Bagian Teal Atas */}
      <polygon 
        points="30,15 42,22 42,36 30,43 18,36 18,22" 
        fill="#FAFAFA" 
      />
    </svg>
  );
};