// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';

// IMPORT KOMPONEN PWA PROMPT
import { PWAInstallPrompt } from '@/components/shared';
// IMPORT BOTTOM NAVIGATION MOBILE
import { BottomNav } from '@/components/shared';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// PARAMETER VIEWPORT UNTUK PWA
export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

// METADATA DENGAN TAMBAHAN MANIFEST PWA
export const metadata: Metadata = {
  metadataBase: new URL('https://omnifit.cloud'),
  title: {
    default: 'Omnifit',
    template: '%s | Omnifit',
  },
  description: 'Platform analitik AI universal untuk mengevaluasi kelayakan riset, ekosistem bisnis, dan korporasi menuju akselerasi global.',
  keywords: ['omnifit', 'ai assessment', 'katalog asesmen', 'explore insight', 'analitik ai'],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://omnifit.cloud',
    siteName: 'Omnifit',
    title: 'Omnifit - Smart Assessment System',
    description: 'Asesmen AI untuk personal, komunitas, dan bisnis. Temukan insight dan action plan berbasis data.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Omnifit Smart Assessment System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omnifit - Smart Assessment System',
    description: 'Asesmen AI untuk personal, komunitas, dan bisnis. Temukan insight dan action plan berbasis data.',
    images: ['/twitter-image'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Omnifit',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body 
        className={`
          ${plusJakarta.variable} 
          font-sans 
          bg-background 
          text-foreground 
          min-h-screen 
          antialiased 
          selection:bg-primary/20 
          selection:text-primary
        `}
      >
        <AuthProvider>
          {children}
          
          <Toaster position="top-right" richColors />
          <PWAInstallPrompt />

          {/* BOTTOM NAVIGATION MOBILE (PWA) */}
          <BottomNav />
          
        </AuthProvider>
      </body>
    </html>
  );
}