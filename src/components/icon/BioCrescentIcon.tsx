import React from 'react';
import { IconProps } from '@/types/curation';

export const BioCrescentIcon: React.FC<IconProps> = ({ 
  size = 32, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path 
        d="M 50 10 A 40 40 0 1 0 85 70 C 70 70 60 60 60 45 C 60 30 75 20 90 25 A 40 40 0 0 0 50 10 Z" 
        fill="#299CAA" 
      />
      <circle cx="70" cy="45" r="8" fill="#299CAA" />
      <circle cx="70" cy="45" r="4" fill="#FAFAFA" />
    </svg>
  );
};