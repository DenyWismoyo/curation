import React from 'react';

function parseInlineText(text: string) {
  const parts = text.split(/(\[\[.*?::.*?\]\]|\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('[[') && part.endsWith(']]') && part.includes('::')) {
      const inner = part.slice(2, -2);
      const splitIdx = inner.indexOf('::');
      const term = inner.slice(0, splitIdx);
      const definition = inner.slice(splitIdx + 2);
      return (
        <span key={index} className="group relative inline-block cursor-help">
          <span className="border-b border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold">{term}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[250px] p-3 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs rounded-xl shadow-xl backdrop-blur-sm z-50 pointer-events-none leading-relaxed text-left">
            {definition}
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></span>
          </span>
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-black text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic font-medium text-foreground">
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
          ? `space-y-6 text-[16px] sm:text-[18px] text-foreground leading-[1.85] font-medium ${className}`
          : `space-y-5 text-[16px] text-foreground leading-[1.8] font-medium ${className}`
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
                  ? 'text-xl sm:text-2xl font-black text-foreground mt-10 mb-4 leading-snug'
                  : 'text-xl font-black text-foreground mt-8'
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
                  ? 'text-2xl sm:text-3xl font-black text-foreground mt-12 mb-6 border-b border-border pb-3 leading-snug'
                  : 'text-2xl font-black text-foreground mt-10 border-b border-border pb-2'
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
                  ? 'text-3xl sm:text-4xl font-black text-foreground mt-12 mb-6 leading-tight'
                  : 'text-3xl font-black text-foreground mt-10'
              }
            >
              {parseInlineText(trimmed.slice(2))}
            </h1>
          );
        }

        if (trimmed.startsWith('> ')) {
          const lines = trimmed.split('\n').map(l => l.replace(/^>\s?/, ''));
          const joined = lines.join(' ');
          
          let isAlert = false;
          let icon = '';
          let alertColor = '';
          let joinedStr = joined;

          if (joinedStr.startsWith('💡')) {
             isAlert = true;
             icon = '💡';
             alertColor = 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200';
             joinedStr = joinedStr.slice(1).trim();
          } else if (joinedStr.startsWith('📝')) {
             isAlert = true;
             icon = '📝';
             alertColor = 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200';
             joinedStr = joinedStr.slice(1).trim();
          }

          if (isAlert) {
             return (
               <div key={idx} className={`my-8 p-5 sm:p-6 rounded-2xl border bg-gradient-to-br backdrop-blur-sm ${alertColor} shadow-sm`}>
                 <div className="flex gap-4">
                   <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
                   <div className="text-sm sm:text-[15px] font-medium leading-relaxed opacity-95">
                     {parseInlineText(joinedStr)}
                   </div>
                 </div>
               </div>
             );
          }

          return (
            <blockquote key={idx} className="border-l-4 border-primary pl-4 py-1 italic text-muted-foreground bg-muted/50 rounded-r-lg my-6">
              {parseInlineText(joined)}
            </blockquote>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed
            .split('\n')
            .filter((line) => /^\d+\.\s/.test(line.trim()));
          return (
            <ol
              key={idx}
              className="space-y-2 pl-5 list-decimal marker:font-black marker:text-primary"
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
                  ? 'space-y-3 sm:space-y-4 my-8 bg-muted/50 text-muted-foreground p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border'
                  : 'space-y-2 bg-muted/50 text-muted-foreground p-5 rounded-2xl border border-border'
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
                        ? 'text-primary mt-[7px] sm:mt-[9px] shrink-0 text-[10px] sm:text-[12px]'
                        : 'text-primary mt-[6px] text-[10px]'
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
