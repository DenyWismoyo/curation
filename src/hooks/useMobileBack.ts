// src/hooks/useMobileBack.ts
import { useEffect, useRef } from 'react';

export const useMobileBack = (isActive: boolean, onBackAction: () => void) => {
  const isPopStateTriggered = useRef(false);

  useEffect(() => {
    // Jika komponen/modal tidak aktif, jangan lakukan apa-apa
    if (!isActive) return;

    isPopStateTriggered.current = false;

    // Sisipkan history palsu ke browser agar aplikasi tidak force quit
    window.history.pushState({ preventAppExit: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      isPopStateTriggered.current = true;
      // Eksekusi fungsi tutup modal atau kembali ke komponen sebelumnya
      onBackAction(); 
    };

    // Dengarkan event gesture swipe back atau tombol fisik back
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // PENTING: Jika pengguna menutup modal secara manual via tombol (bukan di-swipe),
      // kita harus membuang history palsu tersebut agar tumpukan history tetap bersih.
      if (!isPopStateTriggered.current) {
        window.history.go(-1);
      }
    };
  }, [isActive, onBackAction]);
};