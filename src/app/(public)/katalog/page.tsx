'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
      {/* 
        Kita panggil komponen aslinya di sini.
        isOpen diset true agar modal katalog langsung terbuka saat halaman ini diakses.
        onClose diatur agar mengembalikan user ke halaman utama (beranda).
      */}
      <PricingPackages
        isOpen={true}
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