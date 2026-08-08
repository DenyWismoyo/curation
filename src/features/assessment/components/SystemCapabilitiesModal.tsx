// src/app/components/curation/SystemCapabilitiesModal.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  X, CheckCircle2, AlertTriangle, ArrowRight, XOctagon 
} from 'lucide-react';

// IMPORT CUSTOM ICONS
import { 
  EcosystemIcon, 
  AILensIcon, 
  AdminShieldIcon, 
  AiSparkIcon,
  GlobalTargetIcon,
  BrainIcon,
  TechCardIcon
} from '@/components/icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
}

export function SystemCapabilitiesModal({ isOpen, onClose, isLoggedIn = false }: Props) {
  const router = useRouter();
  const [activeCluster, setActiveCluster] = useState<'personal' | 'expert' | 'corporate'>('expert');

  const platformClusters = {
    personal: {
      id: "personal",
      title: "Pengguna Mandiri",
      subtitle: "Pelaku UMKM, Startup, & Individu",
      icon: EcosystemIcon,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-500/10",
      ring: "ring-sky-200 dark:ring-sky-500/20",
      activeBg: "bg-sky-600",
      problemTitle: "Tantangan Evaluasi Konvensional",
      problems: [
        "Kesulitan mengukur kesiapan bisnis atau diri secara objektif karena biaya konsultan yang sangat mahal.",
        "Menunggu berhari-hari hanya untuk mendapatkan hasil evaluasi atau sekadar feedback umum.",
        "Kuesioner sering kali terlalu kaku dan tidak relevan dengan konteks atau model bisnis pengguna.",
        "Hasil evaluasi hanya berupa angka mati tanpa panduan langkah selanjutnya yang jelas."
      ],
      solutionTitle: "Solusi Cerdas Platform Omnifit",
      solutions: [
        { title: "Akses Fleksibel (24/7)", desc: "Pilih dan pesan modul evaluasi secara mandiri melalui katalog pintar kapan saja. Otorisasi berjalan instan." },
        { title: "Formulir Interaktif AI", desc: "Pertanyaan beradaptasi secara dinamis dengan jawaban Anda, layaknya sedang diwawancarai langsung oleh ahli." },
        { title: "Wawasan Visual Instan", desc: "Sesaat setelah selesai, sistem langsung menyajikan grafik kekuatan & titik buta (blind spots) secara transparan." },
        { title: "Peta Jalan (Roadmap) Taktis", desc: "Tidak sekadar skor, Anda mendapat rekomendasi strategis & timeline aksi yang dapat langsung dieksekusi." }
      ]
    },
    expert: {
      id: "expert",
      title: "Tim Ahli & Profesional",
      subtitle: "Asesor, Konselor, & Fasilitator",
      icon: AILensIcon,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      ring: "ring-emerald-200 dark:ring-emerald-500/20",
      activeBg: "bg-emerald-600",
      problemTitle: "Beban Administratif Pendekatan Manual",
      problems: [
        "Terjebak dalam rekapitulasi data dan menghitung skor ratusan peserta yang menyita waktu berhari-hari.",
        "Risiko bias subjektif yang tinggi akibat kelelahan saat membaca tumpukan formulir asesmen fisik/digital.",
        "Kesulitan mendeteksi kebohongan (inkonsistensi jawaban) peserta di awal sesi karena banyaknya data.",
        "Menyampaikan hasil hanya dalam bentuk teks panjang yang sulit dibayangkan dan dipahami oleh klien."
      ],
      solutionTitle: "Super-Power untuk Tim Ahli",
      solutions: [
        { title: "Fondasi Analitik Instan", desc: "Sistem merangkum data otomatis menjadi baseline objektif, bahkan sebelum sesi tatap muka atau wawancara dimulai." },
        { title: "Deteksi Inkonsistensi (Anti-Fraud)", desc: "AI menyoroti anomali atau kontradiksi pernyataan peserta, memberikan Anda panduan untuk menggali lebih dalam." },
        { title: "Ruang Validasi Pakar", desc: "Anda tetap memegang kendali. Tersedia ruang khusus untuk penyesuaian skor, anotasi lapangan, dan kesimpulan akhir." },
        { title: "Laporan Visual Elegan", desc: "Cetak dokumen hasil dengan tata letak profesional & grafik otomatis, meningkatkan kredibilitas layanan Anda di mata klien." }
      ]
    },
    corporate: {
      id: "corporate",
      title: "Korporasi & Institusi",
      subtitle: "Pemerintah, HR Enterprise, & Lembaga",
      icon: AdminShieldIcon,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      ring: "ring-indigo-200 dark:ring-indigo-500/20",
      activeBg: "bg-indigo-600",
      problemTitle: "Inefisiensi Birokrasi Skala Besar",
      problems: [
        "Proses rekrutmen masal, audit, atau penyaringan program berjalan sangat lambat dan memakan biaya tinggi.",
        "Kesulitan menyeragamkan kriteria atau standar penilaian di antara puluhan tim evaluator.",
        "Data tersebar di berbagai platform (Google Form, Excel, Email) sehingga rawan manipulasi dan tercecer.",
        "Infrastruktur sering tumbang (down) ketika diakses secara serentak oleh ribuan peserta pendaftaran."
      ],
      solutionTitle: "Pusat Kendali Enterprise Terpadu",
      solutions: [
        { title: "Personalisasi Matriks (Custom Framework)", desc: "Rancang aturan skor, tingkat keketatan, dan gaya bahasa pelaporan AI agar selaras dengan budaya institusi." },
        { title: "Otomatisasi Alur Kerja (End-to-End)", desc: "Satu pintu terintegrasi dari pengisian form, unggah dokumen, hingga draf SK atau rekomendasi." },
        { title: "Integritas Data Tertinggi", desc: "Dilengkapi mekanisme penyaringan berbasis AI untuk menekan celah fraud & menjaga akurasi profil entitas." },
        { title: "Skalabilitas Auto-Scaling", desc: "Arsitektur serverless kami menjamin kelancaran sistem meski diakses ribuan pengguna secara bersamaan." }
      ]
    }
  };

  const activeClusterData = platformClusters[activeCluster];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: '100%' }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[150] bg-muted text-muted-foreground flex flex-col w-full h-[100dvh] overflow-hidden"
      >
        <div className="card-solid h-16 sm:h-20 px-4 sm:px-8 border-b border-border flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
              <TechCardIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-none">Tentang Omnifit</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-bold hidden sm:block mt-1">Solusi & Kapabilitas Ekosistem</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary text-secondary-foreground rounded-full transition-colors shrink-0"
            title="Tutup Halaman"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10">
          <div className="max-w-[1200px] mx-auto w-full pb-20 space-y-6 lg:space-y-10">
            
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 pt-4">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight text-balance">
                Masa Depan Evaluasi & Kurasi Data
              </h3>
              <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed text-balance">
                Platform asesmen cerdas yang dirancang untuk beradaptasi dengan segala bentuk kebutuhan evaluasi. Kami memproses informasi secara <span className="font-bold text-indigo-600 dark:text-indigo-400">real-time</span> untuk menghasilkan wawasan analitik sekelas konsultan ahli — cepat, presisi, dan bebas birokrasi.
              </p>
            </div>
            
            <div className="card-solid p-2 sm:p-3 rounded-[2rem] sm:rounded-full ring-1 ring-border shadow-sm mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(platformClusters) as Array<keyof typeof platformClusters>).map((key) => {
                const cluster = platformClusters[key];
                const isActive = activeCluster === key;
                const Icon = cluster.icon;
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCluster(key)}
                    className={`flex flex-col items-center justify-center text-center p-3 sm:py-4 rounded-3xl sm:rounded-full transition-all ${
                      isActive 
                        ? `bg-slate-900 text-white shadow-lg scale-100 sm:scale-105 z-10` 
                        : `bg-transparent hover:bg-muted text-muted-foreground text-muted-foreground`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <h4 className="text-sm font-black">{cluster.title}</h4>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                      {cluster.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCluster}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 pt-4"
              >
                <div className="card-solid p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-rose-200 dark:ring-rose-500/20 shadow-sm flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:scale-150 group-hover:bg-rose-100 dark:hover:bg-rose-500/20"></div>
                  
                  <div className="inline-flex items-center gap-3 mb-8 relative z-10">
                    <div className="p-3 bg-rose-100 text-rose-600 dark:text-rose-400 rounded-2xl"><AlertTriangle className="w-6 h-6"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-foreground leading-tight">{activeClusterData.problemTitle}</h3>
                  </div>

                  <ul className="space-y-6 flex-1 relative z-10">
                    {activeClusterData.problems.map((problem, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <XOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-muted-foreground leading-relaxed">{problem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-900 p-6 sm:p-8 lg:p-10 rounded-[2rem] shadow-xl flex flex-col relative overflow-hidden ring-1 ring-slate-800 group">
                  <div className={`absolute bottom-0 right-0 w-40 h-40 ${activeClusterData.color.replace('text', 'bg')}/20 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none transition-all group-hover:scale-150`}></div>
                  
                  <div className="inline-flex items-center gap-3 mb-8 relative z-10">
                    <div className={`p-3 ${activeClusterData.activeBg} text-white rounded-2xl`}><AiSparkIcon size={24}/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{activeClusterData.solutionTitle}</h3>
                  </div>

                  <ul className="space-y-6 flex-1 relative z-10">
                    {activeClusterData.solutions.map((solution, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activeClusterData.activeBg} text-white ring-4 ring-white/10`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                            {solution.title} <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                          </h4>
                          <p className="text-sm font-medium text-slate-400 leading-relaxed">{solution.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* ===== AREA TOMBOL CALL-TO-ACTION (CTA) ===== */}
                  <div className="relative z-10 mt-10 pt-6 border-t border-slate-700/50">
                    
                    {/* CTA WhatsApp: Ahli & Korporasi */}
                    {(activeCluster === 'expert' || activeCluster === 'corporate') && (
                      <a 
                        href="https://wa.me/6285777117587?text=Halo%20Tim%20Omnifit,%20saya%20tertarik%20untuk%20berdiskusi%20mengenai%20kemitraan%20platform%20asesmen." 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#25D366]/20"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Hubungi Admin (WhatsApp)
                      </a>
                    )}

                    {/* CTA Pricing: Pengguna Mandiri & SUDAH LOGIN -> Push Router ke Halaman /katalog */}
                    {(activeCluster === 'personal' && isLoggedIn) && (
                      <button 
                        onClick={() => {
                          onClose();
                          router.push('/katalog');
                        }}
                        className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                      >
                        <TechCardIcon className="w-5 h-5" />
                        Pilih Modul Asesmen Mandiri
                      </button>
                    )}

                    {/* Pesan Informasional Jika Belum Login */}
                    {(activeCluster === 'personal' && !isLoggedIn) && (
                      <p className="text-xs text-slate-400 font-medium text-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        Anda harus <span className="font-bold text-white">masuk (login)</span> di halaman utama terlebih dahulu untuk dapat memilih dan membeli modul asesmen.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden mt-8 shadow-xl">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none transform translate-x-10 -translate-y-10">
                <BrainIcon size={240} />
              </div>
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-rose-500/30 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Mengapa Cara Manual Tidak Relevan?
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-white leading-tight">Meninggalkan Cara Lama</h3>
                  <p className="text-sm lg:text-base text-slate-300 font-medium leading-relaxed">
                    Dalam pelaksanaan program pendampingan, konseling, maupun pelatihan, para ahli sering kali terjebak dalam administrasi. Membaca data dan menghitung skor secara manual tidak hanya memakan waktu, tapi juga rentan akan bias dan menghambat laju pengambilan keputusan.
                  </p>
                </div>
                
                <div className="bg-slate-800/80 p-6 lg:p-8 rounded-3xl ring-1 ring-slate-700/50 backdrop-blur-sm space-y-4">
                  <h4 className="text-sm lg:text-base font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                    <GlobalTargetIcon size={20} /> Transformasi Bersama Omnifit
                  </h4>
                  <p className="text-sm lg:text-base text-slate-200 font-medium leading-relaxed">
                    Platform kami dirancang untuk mengambil alih seluruh beban kerja repetitif tersebut. Sehingga Anda dapat berfokus penuh pada hal yang paling esensial: <span className="text-white font-black underline decoration-indigo-500 decoration-2 underline-offset-4">memberikan pendampingan strategis, validasi mendalam, dan merumuskan solusi.</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}