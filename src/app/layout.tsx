import type { Metadata } from 'next';
// 1. Mengimpor font premium Plus Jakarta Sans dari Google Fonts
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// 2. Mengonfigurasi font
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans', // Variabel ini akan dikenali oleh Tailwind untuk class font-sans
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Curation App',
  description: 'Aplikasi Kurasi Data Elegan dan Minimalis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // scroll-smooth memberikan efek gulir yang lembut
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
        {children}
      </body>
    </html>
  );
}