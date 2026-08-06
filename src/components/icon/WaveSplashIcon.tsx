import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const WaveSplashIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Lengkungan Atas - Teal */}
      <path d="M 10 40 C 20 10 50 10 75 25 C 50 25 30 30 10 40 Z" fill="#299CAA" />
      
      {/* Lengkungan Tengah - Kuning */}
      <path d="M 15 50 C 35 25 65 25 85 35 C 60 40 40 45 15 50 Z" fill="#F59E38" />
      
      {/* Lengkungan Bawah - Orange */}
      <path d="M 20 58 C 35 40 55 40 70 45 C 50 50 35 55 20 58 Z" fill="#F2673A" />
    </svg>
  );
};