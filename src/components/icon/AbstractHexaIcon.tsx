import React from 'react';
import { IconProps } from '@/types/curation';

export const AbstractHexaIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Bentuk Badan Meliuk Organik */}
      <path 
        d="M 20 110 C 5 95 10 75 35 65 C 55 55 60 35 50 15 C 65 25 70 50 45 65 C 25 75 25 90 35 100 C 45 105 40 115 20 110 Z" 
        fill="#F59E38" 
      />
      {/* Hexagon Putih di Bagian Atas Kepala */}
      <polygon 
        points="50,22 58,27 58,37 50,42 42,37 42,27" 
        fill="#FAFAFA" 
      />
    </svg>
  );
};