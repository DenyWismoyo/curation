import React from 'react';
import { IconProps } from '@/types/curation';

export const EcosystemIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Garis Penghubung (Sirkuit) */}
      <path d="M 30 70 L 50 45 L 75 60" stroke="#299CAA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 50 45 L 50 20" stroke="#F59E38" strokeWidth="4" strokeLinecap="round" />
      
      {/* Node Utama (Orange) */}
      <polygon points="50,10 62,17 62,31 50,38 38,31 38,17" fill="#F2673A" />
      
      {/* Node Cabang Kiri (Teal) */}
      <polygon points="25,60 35,66 35,78 25,84 15,78 15,66" fill="#299CAA" />
      
      {/* Node Cabang Kanan (Kuning) */}
      <polygon points="75,50 85,56 85,68 75,74 65,68 65,56" fill="#F59E38" />
    </svg>
  );
};