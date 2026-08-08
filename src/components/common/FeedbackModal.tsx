// src/app/components/shared/FeedbackModal.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send, Loader2, MessageSquareHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function FeedbackModal({ isOpen, onClose, user }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Harap berikan penilaian bintang terlebih dahulu.');
      return;
    }
    if (!message.trim()) {
      toast.error('Harap tuliskan pesan atau ulasan Anda.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'Pengguna Anonim',
        userEmail: user?.email || '-',
        rating,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: 'unread'
      });

      toast.success('Ulasan Berhasil Terkirim!', {
        description: 'Terima kasih atas masukan Anda. Kami akan terus meningkatkan layanan kami.'
      });
      
      setRating(0);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Gagal mengirim ulasan. Coba beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '120%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '120%', opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          // Fitur Swipe / Drag to Close
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.8 }}
          onDragEnd={(e, info) => {
            // Jika digeser lebih dari 100px ke kanan atau dengan kecepatan tinggi
            if (info.offset.x > 100 || info.velocity.x > 400) {
              onClose();
            }
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] w-[calc(100%-2rem)] sm:w-[400px]"
        >
          <div className="card-solid w-full rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(49,46,129,0.3)] overflow-hidden relative ring-1 ring-border">
            {/* Header */}
            <div className="bg-slate-900 p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent pointer-events-none"></div>
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white card-solid/10 hover:card-solid/20 p-2 rounded-full transition-colors z-10"
              >
                <X size={18} />
              </button>
              
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20 relative z-10">
                <MessageSquareHeart className="w-8 h-8 text-indigo-300" />
              </div>
              
              <h3 className="text-2xl font-black text-white relative z-10">Berikan Ulasan</h3>
              <p className="text-slate-300 text-sm font-medium mt-2 relative z-10">
                Bagaimana pengalaman Anda menggunakan platform Omnifit?
              </p>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6 card-solid">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Penilaian Anda</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none transition-transform hover:scale-110"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'fill-slate-100 text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Kritik & Saran</label>
                <Textarea
                  placeholder="Tuliskan kendala, saran fitur baru, atau kesan Anda di sini..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-muted text-muted-foreground border-border rounded-xl resize-none h-32 focus-visible:ring-indigo-500 text-sm font-medium pointer-events-auto"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                ) : (
                  <><Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> Kirim Ulasan</>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}