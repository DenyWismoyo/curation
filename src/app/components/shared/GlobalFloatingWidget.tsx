// src/app/components/shared/GlobalFloatingWidget.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Sparkles, X, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
// Hapus impor useMobileBack dan usePathname

// Lazy Load Modal dengan SSR false
const FeedbackModal = dynamic(
  () => import('@/app/components/shared/FeedbackModal').then((mod) => mod.FeedbackModal),
  { ssr: false }
);

const OmniAiWidget = dynamic(
  () => import('@/app/components/shared/OmniAiWidget').then((mod) => mod.OmniAiWidget),
  { ssr: false }
);

export function GlobalFloatingWidget() {
  const { user } = useAuth();

  // State Management
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup menu bubble otomatis jika user klik area di luarnya
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* ========================================== */}
      {/* WIDGET PANELS (SLIDE DARI KANAN BAWAH) */}
      {/* ========================================== */}
      
      <FeedbackModal
         isOpen={isFeedbackOpen}
         onClose={() => setIsFeedbackOpen(false)}
         user={user}
       />
       
      <OmniAiWidget
         isOpen={isAiOpen}
         onClose={() => setIsAiOpen(false)}
       />

      {/* ========================================== */}
      {/* FLOATING ACTION MENU */}
      {/* ========================================== */}
      
      {/* Sembunyikan tombol floating jika salah satu panel widget sedang aktif */}
      {!isFeedbackOpen && !isAiOpen && (
        <div ref={menuRef} className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end gap-3 pointer-events-auto">
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-3 mb-2 origin-bottom-right"
              >
                {/* SUB-MENU 1: OMNI AI */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setIsAiOpen(true);
                  }}
                  className="flex items-center gap-4 bg-white/95 backdrop-blur-md hover:bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pr-5 rounded-full transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Tanya Omni AI</span>
                </button>

                {/* SUB-MENU 2: BERI ULASAN */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setIsFeedbackOpen(true);
                  }}
                  className="flex items-center gap-4 bg-white/95 backdrop-blur-md hover:bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pr-5 rounded-full transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <MessageSquarePlus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">Beri Ulasan</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TOMBOL UTAMA (TRIGGER) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 active:scale-95 border-2 ${
              isMenuOpen
                 ? 'bg-white text-slate-800 border-slate-200 rotate-90'
                 : 'bg-slate-900 text-white border-transparent hover:scale-105 hover:shadow-indigo-500/30 rotate-0'
            }`}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.3, ease: "backOut" }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.div>
          </button>
        </div>
      )}
    </>
  );
}