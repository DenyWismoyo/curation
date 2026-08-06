import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const DigitalSwanIcon: React.FC<IconProps> = ({ 
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
      {/* Tubuh Angsa Melengkung */}
      <path 
        d="M 80 75 C 60 75 45 60 45 40 C 45 20 65 15 75 25 C 60 25 55 35 55 45 C 55 60 70 65 85 65 C 88 65 85 75 80 75 Z" 
        fill="#299CAA" 
      />
      {/* Node Tekno Ekor */}
      <circle cx="82" cy="48" r="4" fill="#299CAA" />
      <path d="M 82 52 L 82 63" stroke="#299CAA" strokeWidth="3" />
    </svg>
  );
};