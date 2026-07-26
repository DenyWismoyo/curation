'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MapPinned, CheckCircle2, Loader2, CircleDashed, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RoadmapItem {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  order: number;
}

export default function PublicRoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'roadmaps'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RoadmapItem[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as RoadmapItem));
      setRoadmaps(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER HERO */}
      <div className="bg-slate-900 pt-16 pb-24 px-6 relative overflow-hidden text-center">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
         <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">
              <MapPinned size={14} /> Build in Public
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 text-balance">
              Masa Depan <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                Omnifit AI
              </span>
            </h1>
            <p className="text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto text-sm md:text-base text-balance">
              Kami terus berevolusi. Ikuti perjalanan kami dalam membangun infrastruktur analitik dan asesmen kecerdasan buatan yang adaptif dan paling presisi.
            </p>
         </div>
      </div>

      {/* TIMELINE KONTEN */}
      <div className="max-w-4xl mx-auto px-5 sm:px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-12 ring-1 ring-slate-200 shadow-xl shadow-slate-200/50 min-h-[400px]">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
              <p className="font-bold text-xs uppercase tracking-widest">Membaca Rencana AI...</p>
            </div>
          ) : roadmaps.length === 0 ? (
            <div className="text-center py-20">
              <Rocket size={56} className="mx-auto text-slate-200 mb-6 grayscale opacity-50" />
              <h3 className="text-xl font-black text-slate-800 mb-2">Rencana Sedang Disusun</h3>
              <p className="text-sm font-medium text-slate-500">Tim kami sedang meracik pembaruan selanjutnya.</p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 relative">
              {/* Garis Vertikal Timeline */}
              <div className="absolute left-6 sm:left-7 top-4 bottom-8 w-px bg-slate-100 hidden sm:block"></div>
              
              <AnimatePresence>
                {roadmaps.map((item, idx) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.1 }} 
                    className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group"
                  >
                    {/* Ikon Status */}
                    <div className="flex items-center gap-4 sm:gap-0 z-10 shrink-0">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[6px] border-white shadow-sm ring-1 ring-slate-100 transition-transform group-hover:scale-110 ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-500' : 
                        item.status === 'in-progress' ? 'bg-indigo-100 text-indigo-600' : 
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {item.status === 'completed' ? <CheckCircle2 size={20} /> : 
                         item.status === 'in-progress' ? <Loader2 size={20} className="animate-spin" /> : 
                         <CircleDashed size={20} />}
                      </div>
                      
                      {/* Quarter Badge for Mobile (Muncul di sebelah ikon pada HP) */}
                      <div className="sm:hidden">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-block ${
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 
                          item.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 
                          'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                        }`}>
                          {item.quarter}
                        </span>
                      </div>
                    </div>

                    {/* Konten Timeline */}
                    <div className={`flex-1 pt-1 pb-6 sm:pb-8 ${idx !== roadmaps.length - 1 ? 'border-b border-slate-100/70' : ''}`}>
                      
                      {/* Quarter Badge for Desktop (Muncul di atas judul pada PC) */}
                      <span className={`hidden sm:inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 ring-1 ${
                        item.status === 'completed' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 
                        item.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600 ring-indigo-100' : 
                        'bg-slate-50 text-slate-500 ring-slate-200'
                      }`}>
                        {item.quarter}
                      </span>
                      
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 leading-tight group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm sm:text-base font-medium text-slate-500 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}