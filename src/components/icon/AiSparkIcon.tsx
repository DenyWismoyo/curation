import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

export const AiSparkIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = "", 
  ...props 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Garis Orbit Latar (Teal Mudar) */}
      <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(-30 50 50)" stroke="#299CAA" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(30 50 50)" stroke="#F59E38" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      
      {/* Inti (Orange) */}
      <circle cx="50" cy="50" r="14" fill="#F2673A" />
      
      {/* Node Satelit Orbit */}
      <circle cx="18" cy="30" r="4" fill="#299CAA" />
      <circle cx="85" cy="65" r="5" fill="#F59E38" />
      <circle cx="50" cy="18" r="3" fill="#FAFAFA" />
    </svg>
  );
};