'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <m.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-1/2 top-1/2 z-[150] w-[95%] max-w-5xl max-h-[90vh] flex flex-col -translate-x-1/2 -translate-y-1/2 bg-background/70 dark:bg-slate-950/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl ring-1 ring-border dark:ring-white/10 overflow-hidden"
      >
        {/* Header gradient indigo */}
        <div className="relative bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-border/50 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <TechCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-none">Tentang Omnifit</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-bold hidden sm:block mt-1">Solusi & Kapabilitas Ekosistem</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 relative z-10 flex items-center justify-center text-muted-foreground hover:bg-background/80 text-foreground rounded-full transition-colors shrink-0 ring-1 ring-transparent hover:ring-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector — pill premium */}
        <div className="flex gap-2 p-4 border-b border-border/50 bg-muted/30 overflow-x-auto hide-scrollbar shrink-0">
          {(Object.keys(platformClusters) as Array<keyof typeof platformClusters>).map((key) => {
            const cluster = platformClusters[key];
            const isActive = activeCluster === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCluster(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500' 
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground ring-1 ring-transparent hover:ring-border'
                }`}
              >
                <cluster.icon size={16} className={isActive ? 'text-indigo-200' : 'text-muted-foreground'} />
                {cluster.title}
              </button>
            );
          })}
        </div>

        {/* Content: 2 kolom */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <m.div
              key={activeCluster}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
            >
              {/* Kolom Masalah */}
              <div className="bg-rose-500/5 dark:bg-rose-500/8 rounded-[1.5rem] ring-1 ring-rose-200 dark:ring-rose-500/20 p-5 sm:p-6 lg:p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none transition-all group-hover:scale-150"></div>
                
                <div className="inline-flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl ring-1 ring-rose-500/20"><AlertTriangle className="w-5 h-5"/></div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">{activeClusterData.problemTitle}</h3>
                </div>

                <ul className="space-y-4 flex-1 relative z-10">
                  {activeClusterData.problems.map((problem, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <XOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-muted-foreground leading-relaxed">{problem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kolom Solusi */}
              <div className="bg-indigo-500/5 dark:bg-indigo-500/8 rounded-[1.5rem] ring-1 ring-indigo-200 dark:ring-indigo-500/20 p-5 sm:p-6 lg:p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none transition-all group-hover:scale-150"></div>
                
                <div className="inline-flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm"><AiSparkIcon size={20}/></div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">{activeClusterData.solutionTitle}</h3>
                </div>

                <ul className="space-y-5 flex-1 relative z-10">
                  {activeClusterData.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-indigo-600 text-white">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">{solution.title}</h4>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{solution.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* ===== AREA TOMBOL CALL-TO-ACTION (CTA) ===== */}
                <div className="relative z-10 mt-8 pt-6 border-t border-border/50">
                  {(activeCluster === 'expert' || activeCluster === 'corporate') && (
                    <div className="relative group/btn">
                      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover/btn:opacity-40 blur-[2px] transition-all" />
                      <a 
                        href="https://wa.me/6285777117587?text=Halo%20Tim%20Omnifit,%20saya%20tertarik%20untuk%20berdiskusi%20mengenai%20kemitraan%20platform%20asesmen." 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl font-bold transition-transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        Hubungi Admin (WhatsApp)
                      </a>
                    </div>
                  )}

                  {(activeCluster === 'personal' && isLoggedIn) && (
                    <div className="relative group/btn">
                      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover/btn:opacity-40 blur-[2px] transition-all" />
                      <button 
                        onClick={() => {
                          onClose();
                          router.push('/katalog');
                        }}
                        className="relative flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-transform hover:-translate-y-0.5"
                      >
                        <TechCardIcon className="w-4 h-4" />
                        Pilih Modul Asesmen Mandiri
                      </button>
                    </div>
                  )}

                  {(activeCluster === 'personal' && !isLoggedIn) && (
                    <p className="text-xs text-muted-foreground font-medium text-center bg-background/40 p-3 rounded-xl border border-border/50">
                      Anda harus <span className="font-bold text-foreground">masuk (login)</span> di halaman utama terlebih dahulu untuk dapat memilih dan membeli modul asesmen.
                    </p>
                  )}
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </m.div>
    </AnimatePresence>
  );
}