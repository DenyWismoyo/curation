import React from 'react';

function parseInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-black text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic font-medium text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

interface MarkdownContentProps {
  content: string;
  variant?: 'article' | 'document';
  className?: string;
}

export function MarkdownContent({
  content,
  variant = 'document',
  className = '',
}: MarkdownContentProps) {
  if (!content) return null;

  const blocks = content.split(/\n\n+/);
  const isArticle = variant === 'article';

  return (
    <div
      className={
        isArticle
          ? `space-y-6 text-[16px] sm:text-[18px] text-slate-700 leading-[1.85] font-medium ${className}`
          : `space-y-5 text-[16px] text-slate-700 leading-[1.8] font-medium ${className}`
      }
    >
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className={
                isArticle
                  ? 'text-xl sm:text-2xl font-black text-slate-900 mt-10 mb-4 leading-snug'
                  : 'text-xl font-black text-slate-900 mt-8'
              }
            >
              {parseInlineText(trimmed.slice(4))}
            </h3>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className={
                isArticle
                  ? 'text-2xl sm:text-3xl font-black text-slate-900 mt-12 mb-6 border-b border-slate-100 pb-3 leading-snug'
                  : 'text-2xl font-black text-slate-900 mt-10 border-b border-slate-100 pb-2'
              }
            >
              {parseInlineText(trimmed.slice(3))}
            </h2>
          );
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className={
                isArticle
                  ? 'text-3xl sm:text-4xl font-black text-slate-900 mt-12 mb-6 leading-tight'
                  : 'text-3xl font-black text-slate-900 mt-10'
              }
            >
              {parseInlineText(trimmed.slice(2))}
            </h1>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed
            .split('\n')
            .filter((line) => /^\d+\.\s/.test(line.trim()));
          return (
            <ol
              key={idx}
              className="space-y-2 pl-5 list-decimal marker:font-black marker:text-indigo-600"
            >
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {parseInlineText(item.replace(/^\d+\.\s/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed
            .split('\n')
            .filter(
              (line) =>
                line.trim().startsWith('- ') || line.trim().startsWith('* ')
            );
          return (
            <ul
              key={idx}
              className={
                isArticle
                  ? 'space-y-3 sm:space-y-4 my-8 bg-slate-50/70 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100'
                  : 'space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100'
              }
            >
              {items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className={
                    isArticle
                      ? 'flex items-start gap-3 sm:gap-4'
                      : 'flex items-start gap-2.5'
                  }
                >
                  <span
                    className={
                      isArticle
                        ? 'text-indigo-500 mt-[7px] sm:mt-[9px] shrink-0 text-[10px] sm:text-[12px]'
                        : 'text-indigo-500 mt-[6px] text-[10px]'
                    }
                  >
                    ●
                  </span>
                  <span className={isArticle ? 'leading-relaxed flex-1' : undefined}>
                    {parseInlineText(item.replace(/^[-*]\s/, ''))}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className={isArticle ? 'text-left' : undefined}>
            {parseInlineText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
