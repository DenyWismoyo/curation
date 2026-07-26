import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Katalog Asesmen AI',
  description: 'Pilih modul asesmen Omnifit sesuai kebutuhan personal, komunitas, dan bisnis.',
  openGraph: {
    title: 'Katalog Asesmen AI Omnifit',
    description: 'Jelajahi modul asesmen dan bagikan tautan modul dengan preview profesional.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Katalog Asesmen AI Omnifit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Katalog Asesmen AI Omnifit',
    description: 'Jelajahi modul asesmen dan bagikan tautan modul dengan preview profesional.',
    images: ['/twitter-image'],
  },
};

export default function KatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
