import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const EcoBirdIcon: React.FC<IconProps> = ({ 
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
      {/* Lingkaran Luar / Background melengkung */}
      <circle cx="50" cy="50" r="45" stroke="#299CAA" strokeWidth="8" strokeLinecap="round" />
      {/* Elemen Burung Organik */}
      <path 
        d="M30 65C30 40 50 25 70 35C60 45 55 60 65 75C50 80 35 75 30 65Z" 
        fill="#F59E38" 
      />
      {/* Detail Daun di Dalam */}
      <path d="M45 45C50 35 60 35 60 45C55 55 45 55 45 45Z" fill="#299CAA" />
    </svg>
  );
};