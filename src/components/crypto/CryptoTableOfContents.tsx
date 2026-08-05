'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function CryptoTableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Cari semua elemen H2 dan H3 di dalam area konten utama (dengan id="module-content")
    const contentElement = document.getElementById('module-content');
    if (!contentElement) return;

    const elements = Array.from(contentElement.querySelectorAll('h2, h3'));
    const newHeadings = elements.map((elem) => {
      // Jika heading belum punya ID, buatkan ID dari teksnya
      if (!elem.id) {
        elem.id = elem.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'heading';
      }
      return {
        id: elem.id,
        text: elem.textContent || '',
        level: Number(elem.tagName.substring(1)),
      };
    });

    setHeadings(newHeadings);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    elements.forEach((elem) => observer.observe(elem));
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <div className="sticky top-24">
      <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
        Daftar Isi
      </h4>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={cn(
              "block text-sm py-1 transition-colors hover:text-primary",
              heading.level === 3 ? "pl-4" : "font-medium",
              activeId === heading.id 
                ? "text-primary font-semibold border-l-2 border-primary pl-2" 
                : "text-muted-foreground border-l-2 border-transparent pl-2"
            )}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
