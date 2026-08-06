import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const SoaringLeafIcon: React.FC<IconProps> = ({ 
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
      {/* Sayap Kiri Besar - Teal */}
      <path 
        d="M 50 90 C 20 80 10 50 25 35 C 35 45 45 65 50 90 Z" 
        fill="#299CAA" 
      />
      
      {/* Badan & Kepala Burung - Teal/Cyan */}
      <path 
        d="M 50 90 C 55 60 70 30 70 15 C 65 15 60 22 55 25 C 50 40 48 70 50 90 Z" 
        fill="#299CAA" 
      />
      <circle cx="66" cy="22" r="2.5" fill="#FAFAFA" />
      
      {/* Sayap Kanan - Yellow/Gold */}
      <path 
        d="M 53 80 C 65 65 85 55 85 45 C 80 55 65 65 53 80 Z" 
        fill="#F59E38" 
      />
    </svg>
  );
};