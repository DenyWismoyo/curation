import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CSRS',
description: 'Platform analitik AI universal untuk mengevaluasi kelayakan riset, ekosistem bisnis, dan korporasi menuju akselerasi global.',
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
        </AuthProvider>
      </body>
    </html>
  );
}