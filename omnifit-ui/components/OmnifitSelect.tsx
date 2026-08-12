import React from 'react';

interface OmnifitSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  className?: string;
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

export const OmnifitSelect = React.forwardRef<HTMLSelectElement, OmnifitSelectProps>(
  ({ className = '', options, children, onChange, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`flex h-10 w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 font-medium ${className}`}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...props}
      >
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
    );
  }
);
OmnifitSelect.displayName = "OmnifitSelect";
