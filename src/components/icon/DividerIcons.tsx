import React from 'react';

interface DividerProps extends React.SVGProps<SVGSVGElement> {
  width?: number | string;
  className?: string;
}

// 1. Divider dengan Tetesan Air / Daun (Atas)
export const WaveDivider: React.FC<DividerProps> = ({ width = "100%", className = "", ...props }) => {
  return (
    <svg width={width} height="30" viewBox="0 0 400 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <line x1="10" y1="15" x2="170" y2="15" stroke="#299CAA" strokeWidth="2" strokeLinecap="round" />
      {/* Tiga Kelopak Ornamen Tengah */}
      <path d="M185 15C180 10 182 2 187 2C192 2 194 10 189 15Z" fill="#299CAA" />
      <path d="M200 20C200 10 196 0 200 0C204 0 200 10 200 20Z" fill="#F2673A" />
      <path d="M215 15C211 10 213 2 218 2C223 2 225 10 220 15Z" fill="#F59E38" />
      <line x1="230" y1="15" x2="390" y2="15" stroke="#299CAA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// 2. Divider dengan Pin Hexagon (Bawah)
export const PinHexagonDivider: React.FC<DividerProps> = ({ width = "100%", className = "", ...props }) => {
  return (
    <svg width={width} height="30" viewBox="0 0 400 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <line x1="10" y1="15" x2="170" y2="15" stroke="#F59E38" strokeWidth="2" strokeLinecap="round" />
      {/* Ornamen Tengah Pin Map Hexagon */}
      <path d="M190 22C185 15 185 8 200 2C215 8 215 15 210 22Z" fill="#F2673A" />
      <polygon points="200,7 206,11 206,18 200,21 194,18 194,11" fill="#FAFAFA" />
      <line x1="230" y1="15" x2="390" y2="15" stroke="#F59E38" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};