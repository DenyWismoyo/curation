'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

interface SafeLogoProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function SafeLogo({
  src = '/logo.png',
  alt = 'Omnifit',
  width = 80,
  height = 80,
  className = 'w-full h-full object-contain p-2',
  priority = false,
}: SafeLogoProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc === '/logo.png') {
      // Fallback 1: Coba gunakan PWA Icon
      setImgSrc('/icon-192x192.png');
    } else {
      // Fallback 2: Tampilkan SVG Vector Logo Brand jika gambar statis gagal dimuat
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-xs ${className}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
        title={alt}
      >
        <Sparkles className="w-1/2 h-1/2 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={handleError}
    />
  );
}
