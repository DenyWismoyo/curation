import React from 'react';
import { IconProps } from '@/features/assessment/types/assessment.types';

// Lencana Spiral Teal
export const BadgeSpiralIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="25" cy="25" r="25" fill="#299CAA" />
    <path d="M 25 12 C 15 12 12 22 18 30 C 24 38 35 35 38 25 C 40 18 30 18 28 25" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

// Lencana Hexa Kuning
export const BadgeHexaIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="25" cy="25" r="25" fill="#F59E38" />
    <polygon points="25,12 36,19 36,31 25,38 14,31 14,19" fill="#FAFAFA" />
  </svg>
);

// Lencana Node Orange
export const BadgeNodeIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="25" cy="25" r="25" fill="#F2673A" />
    <path d="M 15 35 C 15 20 25 15 35 15 C 35 30 25 35 15 35 Z" fill="#FAFAFA" />
    <circle cx="27" cy="23" r="3" fill="#F2673A" />
  </svg>
);