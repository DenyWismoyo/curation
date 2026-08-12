// src/app/mitra/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { ChevronLeft, ArrowRight, Loader2, Quote, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// IMPORT CUSTOM ICONS BRAND
import { 
  EcosystemIcon, 
  AiSparkIcon, 
  GlobalTargetIcon, 
  InfinityWorkflowIcon,
  FlowingWavesIcon,
  BrainIcon,
  AILensIcon,
  AppModuleTealIcon
} from '@/components/icon';

// IMPORT KEBUTUHAN AUTH
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function EkosistemMitraPage() {
  const router = useRouter();

  // STATE UNTUK AUTH
  const { user, loginWithGoogle } = useAuth();

  // STATE UNTUK DATA KONTEN MITRA
  const [partners, setPartners] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qPartners = query(collection(db, 'landing_partners'), where('isActive', '==', true), orderBy('order', 'asc'));
        const snapPartners = await getDocs(qPartners);
        setPartners(snapPartners.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Gagal memuat ekosistem:", error);
      }

      try {
        const qFeedbacks = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
        const snapFeedbacks = await getDocs(qFeedbacks);

        let fetchedFeedbacks = snapFeedbacks.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedFeedbacks = fetchedFeedbacks.filter((f: any) => f.rating >= 4 && f.message && f.message.length > 10);

        // Hanya memotong 3 ulasan secara acak
        const shuffledFeedbacks = fetchedFeedbacks.sort(() => 0.5 - Math.random()).slice(0, 3);
        setTestimonials(shuffledFeedbacks);
      } catch (feedbackError) {
        console.warn('Akses feedback publik tidak tersedia:', feedbackError);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const maskUserName = (name: string) => {
    if (!name || name === 'Pengguna Anonim' || name.trim() === '') return 'Pengguna Anonim';
    const cleanName = name.trim();
    return cleanName.length > 2 ? `${cleanName.substring(0, 2)}***` : `${cleanName}***`;
  };

  // Pengelompokan Data
  const poweredBy = partners.filter(p => p.category === 'powered_by');
  const mitraStrategis = partners.filter(p => p.category === 'mitra_strategis');
  const klien = partners.filter(p => p.category === 'klien');
  const expertTestimonials = partners.filter(p => p.category === 'testimoni_ahli');

  // Animasi Framer Motion
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariant: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };
  const flipVariant: Variants = {
    hidden: { opacity: 0, rotateY: -90, scale: 0.9 },
    visible: { 
      opacity: 1, 
      rotateY: 0, 
      scale: 1, 
      transition: { duration: 0.8, type: "spring", bounce: 0.4 } 
    }
  };

  // Komponen Helper untuk Grid Logo
  const renderLogoGrid = (data: any[], isFeatured = false) => (
    <motion.div 
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`grid gap-4 sm:gap-6 ${isFeatured ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}
    >
      {data.map(partner => (
        <motion.div key={partner.id} variants={itemVariant}>
          <div className={`card-solid rounded-3xl flex items-center justify-center transition-all duration-500 group relative overflow-hidden border border-border hover:border-indigo-100 hover:shadow-[0_8px_30px_rgb(79,70,229,0.08)] hover:-translate-y-1 ${isFeatured ? 'h-36 sm:h-44 p-8 sm:p-12' : 'h-28 sm:h-32 p-6 sm:p-8'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {partner.targetUrl ? (
              <a href={partner.targetUrl} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center relative z-10">
                <img 
                  src={partner.logoUrl} 
                  alt={partner.name} 
                  onError={(e) => { (e.target as any).src = '/logo.png'; }}
                  className="max-w-full max-h-full object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 ease-out" 
                />
              </a>
            ) : (
              <img 
                src={partner.logoUrl} 
                alt={partner.name} 
                onError={(e) => { (e.target as any).src = '/logo.png'; }}
                className="max-w-full max-h-full object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10" 
              />
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );

  // Komponen Helper untuk Kartu Testimoni Pakar
  const ExpertCard = ({ expert }: { expert: any }) => (
    <div className="w-full flex-col h-full relative overflow-hidden card-solid rounded-[2rem] border border-border shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.08)] transition-all duration-500 group flex">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-50/40 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
      
      <div 
        className="absolute -bottom-10 -right-10 w-56 h-56 opacity-10 group-hover:opacity-25 group-hover:scale-110 transition-all duration-700 pointer-events-none"
        style={{ 
          WebkitMaskImage: 'radial-gradient(circle at bottom right, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 65%)',
          maskImage: 'radial-gradient(circle at bottom right, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 65%)'
        }}
      >
        <BrainIcon size={224} className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700" />
      </div>
      
      <div className="p-6 sm:p-8 flex flex-col h-full relative z-10">
        <Quote className="w-8 h-8 text-indigo-100 mb-5 group-hover:text-indigo-400 transition-colors duration-500" />
        <p className="text-slate-700 font-medium leading-relaxed text-sm sm:text-base italic flex-1 mb-8">
          "{expert.message}"
        </p>
        <div className="flex items-center gap-4 mt-auto pt-5 border-t border-border/50">
          <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground ring-2 ring-white shadow-sm overflow-hidden shrink-0">
            <img src={expert.logoUrl} alt={expert.name} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-foreground truncate">{expert.name}</h4>
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">{expert.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-100 selection:text-indigo-900 font-sans overflow-x-hidden relative">
      
      {/* FLOATING BUTTON MODUL (KANAN BAWAH) -> KE ROUTE KATALOG */}
      <motion.button 
        onClick={() => router.push('/katalog')}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center justify-center w-14 h-14 bg-indigo-600/90 backdrop-blur-xl border border-indigo-500/50 rounded-full shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:bg-indigo-600 transition-all group"
        title="Jelajahi Modul"
      >
        <AppModuleTealIcon className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
      </motion.button>

      <main className="pt-20 pb-24 relative z-10">
        
        {/* HERO SECTION */}
        <motion.section 
          initial="hidden" animate="visible" variants={fadeUp}
          className="text-center max-w-4xl mx-auto mb-20 lg:mb-28 px-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-black uppercase tracking-widest ring-1 ring-indigo-200 dark:ring-indigo-500/20/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Ekosistem & Mitra Strategis
          </div>

          <div className="inline-flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full scale-150 animate-pulse"></div>
            <GlobalTargetIcon size={56} className="relative z-10 text-indigo-600 dark:text-indigo-400 animate-float" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-foreground tracking-tight leading-[1.05] mb-6">
            Jaringan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Inovasi</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
            Dipercaya oleh institusi, perusahaan, dan pakar industri terkemuka untuk mengakselerasi pengambilan keputusan berbasis analitik cerdas.
          </p>
        </motion.section>

        {loading ? (
          <div className="max-w-[1200px] mx-auto px-6 space-y-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 rounded-xl" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Skeleton className="h-36 rounded-3xl" />
                <Skeleton className="h-36 rounded-3xl" />
                <Skeleton className="h-36 rounded-3xl" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 rounded-xl" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                <Skeleton className="h-28 rounded-3xl" />
                <Skeleton className="h-28 rounded-3xl" />
                <Skeleton className="h-28 rounded-3xl" />
                <Skeleton className="h-28 rounded-3xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-24 lg:space-y-32">
            
            <div className="max-w-[1400px] mx-auto px-6 space-y-24 lg:space-y-32">
              {/* 1. POWERED BY */}
              {poweredBy.length > 0 && (
                <section>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-10">
                    <h2 className="text-xl font-black text-foreground flex items-center justify-center sm:justify-start gap-3">
                      <AiSparkIcon size={24} className="text-indigo-600 dark:text-indigo-400" /> Didukung Oleh
                    </h2>
                  </motion.div>
                  {renderLogoGrid(poweredBy, true)}
                </section>
              )}

              {/* 2. MITRA STRATEGIS */}
              {mitraStrategis.length > 0 && (
                <section>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-10">
                    <h2 className="text-xl font-black text-foreground flex items-center justify-center sm:justify-start gap-3">
                      <InfinityWorkflowIcon size={24} className="text-indigo-600 dark:text-indigo-400" /> Mitra Strategis
                    </h2>
                  </motion.div>
                  {renderLogoGrid(mitraStrategis)}
                </section>
              )}

              {/* 3. KLIEN */}
              {klien.length > 0 && (
                <section>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-10">
                    <h2 className="text-xl font-black text-foreground flex items-center justify-center sm:justify-start gap-3">
                      <GlobalTargetIcon size={24} className="text-indigo-600 dark:text-indigo-400" /> Klien & Ekosistem
                    </h2>
                  </motion.div>
                  {renderLogoGrid(klien)}
                </section>
              )}
            </div>

            {/* 4. TESTIMONI PAKAR */}
            {expertTestimonials.length > 0 && (
              <section className="pt-16 pb-16 card-solid border-y border-border overflow-hidden">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16 px-6">
                  <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-4 ring-1 ring-indigo-100">
                    <AILensIcon size={28} />
                  </div>
                  <h2 className="text-3xl font-black text-foreground">Testimoni</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Perspektif pakar industri terhadap platform kami.</p>
                </motion.div>
                
                <div className="max-w-[1000px] mx-auto px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {expertTestimonials.slice(0, 2).map((expert, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: idx * 0.2 }}
                      >
                        <ExpertCard expert={expert} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 5. TESTIMONI PENGGUNA */}
            {testimonials.length > 0 && (
              <section className="max-w-[1200px] mx-auto px-6 pt-16">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-12">
                  <h2 className="text-2xl font-black text-foreground flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <Star className="text-amber-400 w-6 h-6 fill-amber-400" /> Dampak Nyata
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground text-center sm:text-left">Pengalaman pengguna ekosistem di lapangan.</p>
                </motion.div>
                
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  style={{ perspective: '1000px' }}
                >
                  {testimonials.map((item, index) => (
                    <motion.div key={index} variants={flipVariant} className="card-solid p-8 rounded-[2rem] border border-border hover:border-indigo-100 hover:shadow-[0_8px_30px_rgb(79,70,229,0.06)] transition-all duration-500 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex gap-1 mb-5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />
                          ))}
                        </div>
                        <p className="text-muted-foreground font-medium leading-relaxed mb-8 italic">
                          "{item.message}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-5 mt-auto border-t border-slate-50">
                        <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground ring-1 ring-border flex items-center justify-center text-muted-foreground font-black text-sm">
                          {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{maskUserName(item.userName)}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Pengguna Platform</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {partners.length === 0 && testimonials.length === 0 && (
              <div className="text-center py-32 card-solid rounded-[3rem] ring-1 ring-border shadow-sm max-w-5xl mx-auto px-6">
                <EcosystemIcon size={56} className="mx-auto text-slate-200 mb-6 grayscale opacity-40" />
                <p className="text-muted-foreground font-bold text-lg">Direktori kemitraan sedang diperbarui.</p>
              </div>
            )}
          </div>
        )}

        {/* CALL TO ACTION BAWAH -> KE ROUTE KATALOG */}
        {!loading && (
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px 0px -100px 0px" }}
            variants={fadeUp}
            className="mt-32 max-w-[1200px] mx-auto px-6 relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 sm:p-16 lg:p-24 text-center flex flex-col items-center justify-center shadow-2xl"
          >
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center transform scale-150">
              <FlowingWavesIcon size={800} />
            </div>
            
            <div className="relative z-10 space-y-6 max-w-2xl">
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                Siap Mengakselerasi?
              </h3>
              <p className="text-base text-slate-400 font-medium leading-relaxed pb-4">
                Bergabunglah dengan ekosistem kami. Akses infrastruktur AI mutakhir untuk analisis data yang lebih presisi dan terukur.
              </p>
              
              <button onClick={() => router.push('/katalog')} className="btn-primary-rich px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-3 mx-auto active:scale-95 group">
                Jelajahi Modul Sekarang
                <div className="w-6 h-6 rounded-full card-solid/20 flex items-center justify-center group-hover:translate-x-1 transition-transform animate-shimmer">
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}