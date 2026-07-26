import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Insight',
  description: 'Artikel, wawasan, dan update sistem Omnifit untuk keputusan yang lebih presisi.',
  openGraph: {
    title: 'Explore Insight Omnifit',
    description: 'Bagikan artikel dan wawasan Omnifit dengan preview link yang lebih profesional.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Explore Insight Omnifit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Insight Omnifit',
    description: 'Bagikan artikel dan wawasan Omnifit dengan preview link yang lebih profesional.',
    images: ['/twitter-image'],
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
