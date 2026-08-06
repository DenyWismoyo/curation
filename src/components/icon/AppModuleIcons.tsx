import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

// Kartu Modul Tema Teal (Kiri Bawah)
export const AppModuleTealIcon: React.FC<IconProps> = ({ 
  size = 64, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect width="100" height="100" rx="20" fill="#299CAA" />
      {/* Gelombang Kuning Tengah */}
      <path d="M 0 50 C 30 50 40 20 70 20 C 85 20 95 30 100 40 L 100 100 L 0 100 Z" fill="#F59E38" />
      {/* Gelombang Orange Bawah */}
      <path d="M 0 70 C 40 80 60 50 100 70 L 100 100 L 0 100 Z" fill="#F2673A" />
      {/* Node Tekno */}
      <circle cx="80" cy="35" r="5" fill="#FAFAFA" />
      <polygon points="25,65 32,70 32,78 25,83 18,78 18,70" fill="#FAFAFA" />
    </svg>
  );
};

// Kartu Modul Tema Orange (Tengah Bawah)
export const AppModuleOrangeIcon: React.FC<IconProps> = ({ 
  size = 64, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect width="100" height="100" rx="20" fill="#F2673A" />
      {/* Gelombang Krim Tengah */}
      <path d="M 0 40 C 40 30 50 60 100 40 L 100 100 L 0 100 Z" fill="#F8F3E6" />
      {/* Gelombang Kuning Bawah */}
      <path d="M 0 100 L 0 70 C 30 90 70 60 100 80 L 100 100 Z" fill="#F59E38" />
      {/* Node Hexagon */}
      <polygon points="20,50 25,54 25,60 20,64 15,60 15,54" fill="#F2673A" />
      <polygon points="35,60 39,63 39,68 35,71 31,68 31,63" fill="#F2673A" />
    </svg>
  );
};