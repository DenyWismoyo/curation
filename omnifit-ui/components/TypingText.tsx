'use client';

import React, { useEffect, useState } from 'react';
import { m, useInView } from 'framer-motion';
import { cn } from '../utils/cn';

interface TypingTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function TypingText({ 
  text, 
  className, 
  speed = 30, 
  delay = 0,
  cursor = true 
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    
    let i = 0;
    setIsTyping(true);
    
    const delayTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        if (i === text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(delayTimeout);
  }, [text, speed, delay, isInView]);

  return (
    <span ref={ref} className={cn('relative', className)}>
      {displayedText}
      {cursor && (
        <m.span
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          className={cn("inline-block w-[0.1em] h-[1em] bg-current ml-1 align-middle", !isTyping && "hidden")}
        />
      )}
    </span>
  );
}
