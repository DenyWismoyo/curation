// src/app/(landing)/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Omnifit.cloud — Platform AI Ekosistem untuk Keputusan yang Lebih Baik',
  description: 'Omnifit.cloud adalah ekosistem AI terpadu untuk evaluasi diri, intelijen kripto, dan riset mendalam. Tiga produk AI dalam satu platform untuk individu, organisasi, dan trader Indonesia.',
  keywords: [
    'platform AI Indonesia', 'assessment AI', 'crypto intelligence Indonesia',
    'AI ekosistem', 'Omnifit', 'tool trader kripto', 'assessment SDM',
    'riset AI', 'platform investor Indonesia'
  ],
  openGraph: {
    title: 'Omnifit.cloud — Satu Ekosistem AI, Tiga Produk, Satu Tujuan',
    description: 'Dari evaluasi diri, analisis kripto real-time, hingga riset akademis — semua dalam satu platform AI.',
    url: 'https://omnifit.cloud',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <main className="min-h-screen relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
