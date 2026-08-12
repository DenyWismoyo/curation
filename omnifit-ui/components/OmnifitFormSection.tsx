import React from 'react';

interface OmnifitFormSectionProps {
  title?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'blue' | 'teal' | 'none';
  className?: string;
}

const accentMap = {
  indigo: 'border-l-4 border-l-indigo-500',
  blue: 'border-l-4 border-l-blue-500',
  teal: 'border-l-4 border-l-teal-500',
  none: '',
};

export function OmnifitFormSection({ title, children, accent = 'indigo', className = '' }: OmnifitFormSectionProps) {
  return (
    <div className={`bg-white/50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800 ${accentMap[accent]} ${className}`}>
      {title && <h4 className="font-semibold text-sm mb-4">{title}</h4>}
      {children}
    </div>
  );
}
