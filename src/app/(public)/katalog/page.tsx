'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

// Import komponen aslinya secara utuh
import { PricingPackages } from '@/app/components/payment/PricingPackages';

function KatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithGoogle } = useAuth();
  
  // Tangkap parameter URL jika ada user yang mengakses link share (?buy=id_paket)
  const autoOpenId = searchParams.get('buy');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Page header — hanya tampil di mobile (sidebar sudah ada di desktop) */}
      <div className="md:hidden flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-slate-100">
        <Link href="/" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <span className="text-sm font-black text-slate-800">Katalog Asesmen</span>
      </div>

      {/* 
        asPage={true}: renders WITHOUT fixed overlay, respects sidebar offset dari layout.tsx 
        isOpen={true}: selalu terbuka karena ini adalah halaman, bukan trigger dari tombol
      */}
      <PricingPackages
        isOpen={true}
        asPage={true}
        onClose={() => router.push('/')}
        user={user}
        onLoginRequest={loginWithGoogle}
        autoOpenPackageId={autoOpenId}
      />
    </div>
  );
}

// Dibungkus dengan Suspense karena kita menggunakan useSearchParams() dari Next.js
export default function KatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Katalog...</p>
        </div>
      </div>
    }>
      <KatalogContent />
    </Suspense>
  );
}