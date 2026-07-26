import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import fs from 'node:fs/promises';
import path from 'node:path';

const parseInlineText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic font-medium text-slate-800">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-5 text-[16px] text-slate-700 leading-[1.8] font-medium">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-xl font-black text-slate-900 mt-8">{parseInlineText(trimmed.slice(4))}</h3>;
        }

        if (trimmed.startsWith('## ')) {
          return <h2 key={idx} className="text-2xl font-black text-slate-900 mt-10 border-b border-slate-100 pb-2">{parseInlineText(trimmed.slice(3))}</h2>;
        }

        if (trimmed.startsWith('# ')) {
          return <h1 key={idx} className="text-3xl font-black text-slate-900 mt-10">{parseInlineText(trimmed.slice(2))}</h1>;
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((line) => /^\d+\.\s/.test(line.trim()));
          return (
            <ol key={idx} className="space-y-2 pl-5 list-decimal marker:font-black marker:text-indigo-600">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>{parseInlineText(item.replace(/^\d+\.\s/, ''))}</li>
              ))}
            </ol>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '));
          return (
            <ul key={idx} className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2.5">
                  <span className="text-indigo-500 mt-[6px] text-[10px]">●</span>
                  <span>{parseInlineText(item.replace(/^[-*]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return <p key={idx}>{parseInlineText(trimmed)}</p>;
      })}
    </div>
  );
};

export default async function AffiliateProgramGuidePage() {
  let content = 'Dokumen program affiliate belum tersedia.';
  try {
    const filePath = path.join(process.cwd(), 'public', 'docs', 'program-affiliate-omnifit.md');
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    content = 'Gagal memuat dokumen program affiliate.';
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-8 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/affiliate"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"
        >
          <ChevronLeft size={16} />
          Kembali ke Portal Affiliate
        </Link>

        <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm p-6 md:p-10">
          <MarkdownRenderer content={content} />
        </Card>
      </div>
    </div>
  );
}
