import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} Omnifit. Semua hak dilindungi.
        </p>
        <nav className="flex items-center gap-6 text-sm font-bold text-slate-500">
          <Link href="/kebijakan" className="hover:text-indigo-600 transition-colors">
            Kebijakan Layanan
          </Link>
          <Link href="/privasi" className="hover:text-indigo-600 transition-colors">
            Privasi
          </Link>
          <Link href="/roadmap" className="hover:text-indigo-600 transition-colors">
            Roadmap
          </Link>
        </nav>
      </div>
    </footer>
  );
}
