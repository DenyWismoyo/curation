import React from 'react';
import { IconProps } from './types';

// 1. Hexagon Outline (Kuning)
export const HexagonOutlineIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <polygon
        points="50,8 92,32 92,80 50,92 8,80 8,32"
        stroke="#F59E38"
        strokeWidth="10"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

// 2. Hexagon Solid (Orange)
export const HexagonSolidIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <polygon
        points="50,8 92,32 92,80 50,92 8,80 8,32"
        fill="#F2673A"
      />
    </svg>
  );
};