// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';

// IMPORT KOMPONEN PWA PROMPT
import { PWAInstallPrompt } from '@/app/components/shared/PWAInstallPrompt';
// IMPORT KOMPONEN WIDGET OMNIAI
import { GlobalFloatingWidget } from '@/app/components/shared/GlobalFloatingWidget';

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
  title: 'Omnifit',
  description: 'Platform analitik AI universal untuk mengevaluasi kelayakan riset, ekosistem bisnis, dan korporasi menuju akselerasi global.',
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

          
          {/* WIDGET GABUNGAN AI & FEEDBACK */}
          <GlobalFloatingWidget />
          
        </AuthProvider>
      </body>
    </html>
  );
}