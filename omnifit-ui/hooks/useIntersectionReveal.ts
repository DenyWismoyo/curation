'use client';

import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface IntersectionRevealOptions {
  once?: boolean;
  margin?: string;
  amount?: 'some' | 'all' | number;
}

export function useIntersectionReveal(options?: IntersectionRevealOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: (options?.margin as any) ?? '-50px',
    amount: options?.amount ?? 'some'
  });

  return { ref, isInView };
}
