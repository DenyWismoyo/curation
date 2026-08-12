'use client';

import { useState, useEffect } from 'react';

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    
    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowWidth > 0 && windowWidth < breakpoints.md,
    isTablet: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isDesktop: windowWidth >= breakpoints.lg,
    width: windowWidth,
  };
}
