'use client';

// src/components/domain/public/PageHero.tsx
/**
 * Gradient hero header yang digunakan di halaman-halaman public.
 * Menggantikan inline gradient header di explore, komunitas, dan halaman lain.
 */
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageHeroProps {
  /** Teks kecil di atas title (uppercase label) */
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  /** Tampilkan tombol kembali + href-nya */
  backHref?: string;
  backLabel?: string;
  /** Slot kanan header (misal: NotificationBell) */
  actions?: React.ReactNode;
  /** Tambah content di bawah title dalam area hero */
  children?: React.ReactNode;
  /** Center-align semua konten hero (cocok untuk halaman komunitas/landing) */
  centered?: boolean;
  /** Tambah class ke gradient wrapper */
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel = 'Kembali',
  actions,
  children,
  centered = false,
  className = '',
}: PageHeroProps) {
  return (
    <div
      className={`bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white pt-12 pb-10 px-5 lg:px-10 ${className}`}
    >
      <div className={`max-w-3xl mx-auto ${centered ? 'text-center' : ''}`}>
        {/* Back button OR eyebrow + actions row */}
        {!centered && (
          <div className="flex items-center justify-between mb-5">
            {backHref ? (
              <Link
                href={backHref}
                className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-medium transition-colors"
              >
                <ChevronLeft size={16} />
                {backLabel}
              </Link>
            ) : eyebrow ? (
              <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest">
                {eyebrow}
              </p>
            ) : (
              <div />
            )}
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        )}

        {/* Centered eyebrow */}
        {centered && eyebrow && (
          <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mb-4">
            {eyebrow}
          </p>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-black leading-tight tracking-tight"
        >
          {title}
        </motion.h1>

        {subtitle && (
          <p className={`text-indigo-200 text-sm mt-1.5 leading-relaxed ${centered ? 'max-w-sm mx-auto' : ''}`}>
            {subtitle}
          </p>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}
