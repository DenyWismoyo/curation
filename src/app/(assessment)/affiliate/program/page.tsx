// src/app/(public)/affiliate/program/page.tsx

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MarkdownContent } from '@/components/domain/public';

export default async function AffiliateProgramGuidePage() {
  let content = 'Dokumen program affiliate belum tersedia.';
  try {
    const filePath = path.join(process.cwd(), 'public', 'docs', 'program-affiliate-omnifit.md');
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    content = 'Gagal memuat dokumen program affiliate.';
  }

  return (
    <div className="min-h-screen bg-background py-8 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/affiliate"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 bg-muted text-muted-foreground px-3 py-1.5 rounded-xl ring-1 ring-border hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all group w-fit"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke Portal Affiliate
        </Link>

        <div className="card-solid rounded-[2rem] ring-1 ring-border shadow-sm p-6 md:p-10">
          <MarkdownContent content={content} variant="document" />
        </div>
      </div>
    </div>
  );
}
