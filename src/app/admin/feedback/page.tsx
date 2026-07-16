// src/app/admin/feedback/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquareShare, Star, Trash2, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackDoc {
  id: string;
  userName: string;
  userEmail: string;
  rating: number;
  message: string;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: FeedbackDoc[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as FeedbackDoc);
      });
      setFeedbacks(data);
      setLoading(false);
    }, (error) => {
      console.error("Gagal menarik data ulasan:", error);
      toast.error("Gagal memuat ulasan pengguna.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ulasan ini secara permanen?")) return;
    
    try {
      await deleteDoc(doc(db, 'feedbacks', id));
      toast.success("Ulasan berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus ulasan:", error);
      toast.error("Terjadi kesalahan saat menghapus data.");
    }
  };

  // Kalkulasi Summary
  const totalReviews = feedbacks.length;
  const averageRating = totalReviews > 0 
    ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) 
    : '0.0';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p className="font-bold tracking-widest text-xs uppercase">Memuat Ulasan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquareShare className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" /> Suara Pengguna
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Pantau ulasan, kritik, dan saran dari pengguna secara real-time untuk mengevaluasi kualitas layanan Omnifit.
          </p>
        </div>
        
        {/* Summary Card */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm shrink-0">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rata-rata Rating</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">
              {averageRating} <span className="text-sm text-slate-500 font-medium">/ 5.0</span>
            </p>
          </div>
          <div className="w-px h-10 bg-slate-200 mx-2"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Ulasan</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">{totalReviews}</p>
          </div>
        </div>
      </div>

      {/* Grid Ulasan */}
      {feedbacks.length === 0 ? (
        <div className="py-24 text-center text-slate-500 bg-white ring-1 ring-slate-200 rounded-3xl shadow-sm">
          <MessageSquareShare className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <p className="font-bold text-lg text-slate-900">Belum Ada Ulasan</p>
          <p className="text-sm mt-1">Ulasan dari pengguna akan muncul di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {feedbacks.map((item) => (
            <Card key={item.id} className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-slate-900 truncate">{item.userName}</h3>
                  <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {item.userEmail}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md text-amber-700 text-xs font-black ring-1 ring-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> {item.rating}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic line-clamp-4">
                  "{item.message}"
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> 
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <Button 
                  variant="ghost" 
                  onClick={() => handleDelete(item.id)}
                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                  title="Hapus Ulasan"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

            </Card>
          ))}
        </div>
      )}
    </div>
  );
}