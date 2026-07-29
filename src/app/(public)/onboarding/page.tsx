// src/app/(public)/onboarding/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Building2, User, Rocket, Users, Landmark, Loader2, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AiSparkIcon } from '@/components/icon';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

// ============================================================
// DATA
// ============================================================
const PURPOSES = [
  { id: 'B2B', label: 'Bisnis B2B', description: 'Skala bisnis ke enterprise & korporat', icon: <Building2 size={24} /> },
  { id: 'Personal', label: 'Pengembangan Diri', description: 'Tingkatkan kapasitas personal & karir', icon: <User size={24} /> },
  { id: 'Startup', label: 'Startup & Inovasi', description: 'Validasi, traction & pertumbuhan cepat', icon: <Rocket size={24} /> },
  { id: 'Komunitas', label: 'Komunitas & Organisasi', description: 'Bangun ekosistem dan dampak sosial', icon: <Users size={24} /> },
  { id: 'Pemerintah', label: 'Pemerintahan & LSM', description: 'Tata kelola, kebijakan & pelayanan publik', icon: <Landmark size={24} /> },
];

const SECTORS: Record<string, string[]> = {
  B2B: ['Teknologi', 'Manufaktur', 'FMCG', 'Logistik', 'Keuangan', 'Properti', 'Kesehatan', 'Pendidikan'],
  Personal: ['Teknologi', 'Pemasaran', 'Keuangan', 'Seni & Kreatif', 'Manajemen', 'Hukum', 'Kesehatan', 'Pendidikan'],
  Startup: ['AI & Data', 'Fintech', 'Edtech', 'Healthtech', 'Agritech', 'Proptech', 'Retail-tech', 'GovTech'],
  Komunitas: ['Kepemudaan', 'Lingkungan', 'Budaya', 'Keagamaan', 'Pemberdayaan', 'Riset & Akademik', 'Olahraga', 'Sosial'],
  Pemerintah: ['Desa & Kelurahan', 'Pemerintah Daerah', 'Kementerian', 'BUMN', 'LSM', 'Yayasan', 'Badan Riset', 'Lainnya'],
};

type AdaptivePlanStep = {
  title: string;
  whyNow: string;
  action: string;
};

type AdaptivePlanModule = {
  moduleId: string;
  moduleName: string;
  reason: string;
  estimatedImpact: string;
};

type AdaptivePlanResponse = {
  summary?: string;
  steps?: AdaptivePlanStep[];
  recommendedModules?: AdaptivePlanModule[];
  source?: string;
  warning?: string;
};

const STEPS = ['Tujuan', 'Sektor', 'Rekomendasi AI'];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [adaptiveSummary, setAdaptiveSummary] = useState('');
  const [adaptiveSteps, setAdaptiveSteps] = useState<AdaptivePlanStep[]>([]);
  const [adaptiveModules, setAdaptiveModules] = useState<AdaptivePlanModule[]>([]);
  const [checking, setChecking] = useState(true);
  const [completedWithoutForce, setCompletedWithoutForce] = useState(false);
  const forceMode = searchParams.get('force') === '1';

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login?next=/onboarding'); return; }

    // Skip onboarding if already completed
    const checkOnboarding = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!forceMode && snap.exists() && snap.data()?.onboardingCompleted === true) {
          setCompletedWithoutForce(true);
          return;
        }
        setCompletedWithoutForce(false);
      } catch (e) {
        // If error, let them proceed
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, loading, forceMode, router]);

  const saveAndContinue = async () => {
    if (!user || !purpose || !sector) return;
    setSaving(true);
    setGeneratingPlan(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: { purpose, sector },
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      });

      const callable = httpsCallable(functions, 'generateAdaptiveOnboardingPlan');
      const response = await callable({ purpose, sector });
      const payload = response.data as AdaptivePlanResponse;

      setAdaptiveSummary(payload.summary || 'Berikut rencana prioritas Anda berdasarkan profil onboarding.');
      setAdaptiveSteps(Array.isArray(payload.steps) ? payload.steps.slice(0, 5) : []);
      setAdaptiveModules(Array.isArray(payload.recommendedModules) ? payload.recommendedModules.slice(0, 4) : []);

      if (payload.warning) {
        toast.info('Adaptive agent menggunakan mode fallback sementara.');
      }

      setStep(2);
    } catch (e) {
      console.error('Gagal simpan onboarding:', e);
      toast.error('Gagal menyusun rekomendasi onboarding adaptif. Silakan coba lagi.');
    } finally {
      setGeneratingPlan(false);
      setSaving(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <AiSparkIcon size={40} className="text-indigo-600 animate-pulse" />
      </div>
    );
  }

  if (completedWithoutForce) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-[#FAFAFA] to-purple-50 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg bg-white rounded-3xl ring-1 ring-slate-200 p-8 text-center shadow-sm">
          <div className="inline-flex w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <AiSparkIcon size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Onboarding Sudah Selesai</h1>
          <p className="text-sm text-slate-500 mb-6">
            Anda tetap bisa mengulangi onboarding kapan saja untuk memperbarui prioritas dan rekomendasi AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold"
            >
              Kembali ke Dashboard
            </Button>
            <Button
              onClick={() => router.replace('/onboarding?force=1')}
              className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Ulangi Onboarding
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-[#FAFAFA] to-purple-50 flex flex-col items-center justify-center px-6 pb-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-lg">

        {/* PROGRESS STEPS */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < step ? 'bg-indigo-600 text-white' :
                  i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 max-w-[40px] ${i < step ? 'bg-indigo-400' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 0: CHOOSE PURPOSE */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="inline-flex w-16 h-16 bg-indigo-600 rounded-3xl items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
                  <AiSparkIcon size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">Selamat Datang di<br/>Omnifit AI</h1>
                <p className="text-slate-500 font-medium text-sm">Bantu kami personalisasi pengalaman Anda</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Apa tujuan utama Anda?</p>
                {PURPOSES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl ring-2 transition-all text-left ${
                      purpose === p.id
                        ? 'ring-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                        : 'ring-slate-200 bg-white hover:ring-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      purpose === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.icon}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{p.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                    </div>
                    {purpose === p.id && <ChevronRight size={16} className="ml-auto text-indigo-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep(1)}
                disabled={!purpose}
                className="w-full mt-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lanjut <ChevronRight size={16} className="ml-1" />
              </Button>
            </motion.div>
          )}

          {/* STEP 1: CHOOSE SECTOR */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(0)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 text-slate-500 hover:text-indigo-600 transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Pilih Sektor</h2>
                  <p className="text-xs text-slate-500">untuk {PURPOSES.find(p => p.id === purpose)?.label}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(SECTORS[purpose!] || []).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSector(s)}
                    className={`p-4 rounded-2xl ring-2 text-center transition-all font-bold text-sm ${
                      sector === s
                        ? 'ring-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'ring-slate-200 bg-white text-slate-700 hover:ring-indigo-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <Button
                onClick={saveAndContinue}
                disabled={!sector || saving || generatingPlan}
                className="w-full mt-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-sm disabled:opacity-40"
              >
                {saving || generatingPlan ? (
                  <span className="flex items-center gap-2"><AiSparkIcon size={16} className="animate-spin" /> Menyusun Rekomendasi Adaptif...</span>
                ) : (
                  <span className="flex items-center gap-2">Lihat Rekomendasi AI <ChevronRight size={16} /></span>
                )}
              </Button>
            </motion.div>
          )}

          {/* STEP 2: AI RECOMMENDATIONS */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="inline-flex w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl items-center justify-center mb-4 shadow-xl shadow-indigo-500/25"
                >
                  <AiSparkIcon size={40} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Profil Anda Tersimpan! 🎉</h2>
                <p className="text-sm text-slate-500">
                  Berdasarkan profil <strong>{PURPOSES.find(p => p.id === purpose)?.label}</strong> – <strong>{sector}</strong>, AI kami menyusun rencana 5 langkah prioritas.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl ring-1 ring-indigo-100 mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-2">Ringkasan Adaptif</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {adaptiveSummary || 'Rencana onboarding Anda sedang diprioritaskan agar lebih relevan dengan tujuan saat ini.'}
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">5 Langkah yang Direkomendasikan</p>
                {adaptiveSteps.length === 0 ? (
                  <div className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 text-slate-500 text-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Menyiapkan langkah prioritas...
                  </div>
                ) : (
                  adaptiveSteps.map((stepItem, index) => (
                    <motion.div
                      key={`${stepItem.title}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.06 }}
                      className="bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">{index + 1}</div>
                        <p className="font-black text-slate-900 text-sm">{stepItem.title}</p>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{stepItem.whyNow}</p>
                      <p className="text-xs text-indigo-700 font-semibold">Aksi cepat: {stepItem.action}</p>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="space-y-4">
                {adaptiveModules.map((rec, i) => (
                  <motion.div
                    key={`${rec.moduleId}-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="bg-white p-6 rounded-2xl ring-2 ring-indigo-100 shadow-sm"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <Target size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{rec.moduleName}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{rec.reason}</p>
                        <p className="text-xs text-indigo-700 mt-1 font-semibold">Dampak: {rec.estimatedImpact}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/katalog?buy=${rec.moduleId}`)}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl"
                    >
                      Pilih Modul Ini
                    </Button>
                  </motion.div>
                ))}

                {adaptiveModules.length === 0 && (
                  <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 text-center">
                    <Sparkles className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Belum ada modul spesifik yang bisa dicocokkan. Anda tetap bisa eksplor katalog lengkap.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/katalog')}
                  className="flex-1 h-11 font-bold text-sm rounded-xl border-slate-200 text-slate-600"
                >
                  Lihat Katalog
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 h-11 font-bold text-sm rounded-xl border-slate-200 text-slate-600"
                >
                  Ke Dashboard
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
