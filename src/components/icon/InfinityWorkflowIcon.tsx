import React from 'react';
import { IconProps } from '@/types/curation';

export const InfinityWorkflowIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Kurva Kiri (Teal) */}
      <path 
        d="M 50 50 C 30 20 10 30 15 55 C 20 80 40 70 50 50 Z" 
        stroke="#299CAA" 
        strokeWidth="6" 
        fill="none" 
      />
      
      {/* Kurva Kanan (Orange) */}
      <path 
        d="M 50 50 C 70 80 90 70 85 45 C 80 20 60 30 50 50 Z" 
        stroke="#F2673A" 
        strokeWidth="6" 
        fill="none" 
      />
      
      {/* Spark Transisi di Tengah */}
      <circle cx="50" cy="50" r="6" fill="#F59E38" />
      <circle cx="50" cy="50" r="2" fill="#FAFAFA" />
      
      {/* Node Proses */}
      <circle cx="15" cy="55" r="4" fill="#299CAA" />
      <circle cx="85" cy="45" r="4" fill="#F2673A" />
    </svg>
  );
};