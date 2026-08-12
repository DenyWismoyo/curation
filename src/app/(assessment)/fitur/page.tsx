'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  BrainCircuit, 
  Target, 
  Sparkles, 
  Building2, 
  Link as LinkIcon, 
  CreditCard,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function FeaturesPage() {
  const features = [
    {
      icon: <GitBranch size={24} className="text-indigo-600 dark:text-indigo-400" />,
      title: 'Asesmen Dinamis (Branching)',
      description: 'Pertanyaan cerdas yang beradaptasi secara real-time berdasarkan jawaban Anda sebelumnya, memberikan pengalaman diagnosis yang sangat personal dan akurat.',
      color: 'bg-indigo-100',
    },
    {
      icon: <BrainCircuit size={24} className="text-emerald-600 dark:text-emerald-400" />,
      title: 'Analisis AI Mendalam',
      description: 'Sistem scoring otomatis yang menghasilkan pemetaan matriks (SWOT), identifikasi risiko kritis (Critical Risks), dan insight yang tidak terlihat oleh mata telanjang.',
      color: 'bg-emerald-100',
    },
    {
      icon: <Target size={24} className="text-rose-600 dark:text-rose-400" />,
      title: 'Auto-Generated Action Plan',
      description: 'Ubah hasil diagnosis menjadi To-Do List yang siap dieksekusi. AI menyusun rencana aksi bertahap (30 hari) sesuai prioritas masalah Anda.',
      color: 'bg-rose-100',
    },
    {
      icon: <Sparkles size={24} className="text-amber-600 dark:text-amber-400" />,
      title: 'Konsultasi AI Premium',
      description: 'Ruang kerja eksklusif untuk membedah "Hidden Metrics" dan anomali data hasil asesmen Anda langsung bersama AI Konsultan super pintar.',
      color: 'bg-amber-100',
    },
    {
      icon: <Building2 size={24} className="text-sky-600 dark:text-sky-400" />,
      title: 'B2B Cohort Workspace',
      description: 'Dasbor manajemen khusus untuk entitas perusahaan. Lacak perkembangan tim, pantau analitik cohort, dan distribusikan Token Asesmen dengan mudah.',
      color: 'bg-sky-100',
    },
    {
      icon: <LinkIcon size={24} className="text-purple-600 dark:text-purple-400" />,
      title: 'Sistem Afiliasi Terintegrasi',
      description: 'Program referral canggih yang memungkinkan pengguna mendapatkan komisi secara transparan dari setiap asesmen yang direkomendasikan.',
      color: 'bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-10 pb-20 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-indigo-50 to-white dark:hidden rounded-b-[40px] sm:rounded-b-[100px] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute top-20 -left-20 w-72 h-72 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto pt-10 pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full card-highlight border border-border text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
              <ShieldCheck size={14} /> Ekosistem Terintegrasi
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 tracking-tight leading-tight">
              Lebih Dari Sekadar <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Asesmen Biasa.</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-8">
              Omnifit Assessment adalah <em>decision support engine</em>. Kami mengubah data dari kuesioner menjadi keputusan intervensi yang nyata dan bisa langsung Anda eksekusi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild className="rounded-xl h-14 px-8 btn-primary-rich font-black text-base transition-all shadow-xl hover:scale-105">
                <Link href="/katalog">Coba Asesmen Sekarang <ChevronRight size={18} className="ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl h-14 px-8 border-border hover:bg-muted text-foreground font-bold text-base backdrop-blur-md transition-all">
                <Link href="/login">Masuk ke Dasbor</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-solid card-interactive p-8 flex flex-col h-full relative"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-muted text-muted-foreground rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative z-10 ${feature.color} ring-4 ring-white shadow-sm group-hover:-translate-y-1 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-black text-foreground mb-3 relative z-10 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed relative z-10">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* B2B Promo Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 max-w-5xl mx-auto card-premium-dark rounded-[2.5rem] p-10 sm:p-14 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 md:max-w-xl text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">Solusi Enterprise & B2B</h2>
            <p className="text-indigo-100 font-medium text-base mb-0 leading-relaxed">
              Tingkatkan produktivitas SDM Anda dengan model asesmen berbasis <em>Strategic Tier</em>. Mulai dari skala kecil hingga level <em>enterprise</em>, lacak dampak dan ROI tim Anda.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Button asChild className="rounded-2xl h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base transition-all shadow-lg shadow-emerald-900/50 hover:scale-105">
              <Link href="/katalog">Eksplor Solusi B2B</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
