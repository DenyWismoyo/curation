import React from 'react';

interface OmnifitTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const OmnifitTextarea = React.forwardRef<HTMLTextAreaElement, OmnifitTextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex min-h-[80px] w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 font-medium ${className}`}
        {...props}
      />
    );
  }
);
OmnifitTextarea.displayName = "OmnifitTextarea";
