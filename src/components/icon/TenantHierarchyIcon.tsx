import React from 'react';
import { IconProps } from '@/types/curation';

export const TenantHierarchyIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Garis Koneksi Organik */}
      <path d="M 50 35 C 50 50 30 50 30 65" stroke="#299CAA" strokeWidth="4" strokeLinecap="round" />
      <path d="M 50 35 C 50 50 70 50 70 65" stroke="#F59E38" strokeWidth="4" strokeLinecap="round" />
      
      {/* Node Super Admin (Orange) */}
      <polygon points="50,12 62,20 62,32 50,40 38,32 38,20" fill="#F2673A" />
      <circle cx="50" cy="26" r="4" fill="#FAFAFA" />

      {/* Node Admin Unit Kiri (Teal) */}
      <polygon points="30,62 40,68 40,78 30,84 20,78 20,68" fill="#299CAA" />
      
      {/* Node Admin Unit Kanan (Kuning Emas) */}
      <polygon points="70,62 80,68 80,78 70,84 60,78 60,68" fill="#F59E38" />
    </svg>
  );
};