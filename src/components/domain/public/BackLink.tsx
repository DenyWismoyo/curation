'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BackLinkProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
  pill?: boolean;
}

export function BackLink({
  href,
  label = 'Kembali',
  onClick,
  className,
  pill = true,
}: BackLinkProps) {
  const router = useRouter();

  const classes = cn(
    'inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors group',
    pill && 'bg-slate-50 px-3 py-1.5 rounded-xl w-fit',
    className
  );

  const icon = (
    <ChevronLeft
      size={16}
      className="group-hover:-translate-x-0.5 transition-transform"
    />
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      className={classes}
    >
      {icon}
      {label}
    </button>
  );
}
