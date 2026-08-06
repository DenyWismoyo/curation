import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const BrainIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
      {...props}
    >
      {/* Sisi Kiri - Teal/Cyan */}
      <path 
        d="M100 30C70 30 40 45 30 75C20 105 35 130 55 145C65 152 75 155 85 160C88 162 90 170 95 180H100V30Z" 
        fill="#299CAA" 
      />
      {/* Sisi Kanan - Orange & Yellow dengan Node Tekno */}
      <path 
        d="M100 30C130 30 160 45 170 75C180 105 165 130 145 145C135 152 125 155 115 160C112 162 110 170 105 180H100V30Z" 
        fill="#F2673A" 
      />
      {/* Aksen lingkaran/node tekno di bagian kanan */}
      <circle cx="140" cy="70" r="6" fill="#F59E38" />
      <circle cx="155" cy="110" r="5" fill="#FAFAFA" />
      <circle cx="120" cy="135" r="4" fill="#F59E38" />
      
      {/* Catatan: Jika Anda sudah mengekstrak SVG asli dari Figma, 
          silakan ganti tag <path> di atas dengan path presisi dari Figma Anda */}
    </svg>
  );
};