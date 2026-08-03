'use client';

import React, { useState } from 'react';
import { FormTemplate } from '@/types/curation';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, Database, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { toast } from 'sonner';

interface TabAdaptiveProps {
  template: FormTemplate;
  onChange: (t: FormTemplate) => void;
}

export function TabAdaptive({ template, onChange }: TabAdaptiveProps) {
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const formMode = template.formMode || 'standard';
  const isAdaptive = (template.aiPromptConfig as any)?.isAdaptive || false;
  const maxAdaptiveSections = (template.aiPromptConfig as any)?.maxAdaptiveSections || 10;

  const updateConfig = (field: string, value: any) => {
    onChange({
      ...template,
      aiPromptConfig: {
        ...(template.aiPromptConfig || {}),
        [field]: value
      } as any
    });
  };

  const handleWarmup = async () => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      toast.error('Token autentikasi tidak ditemukan. Harap login ulang.');
      return;
    }

    setIsWarmingUp(true);
    toast.info('Memulai warm-up Vector DB...');

    try {
      const response = await fetch(`https://asia-southeast2-soso-creative-group.cloudfunctions.net/manualTriggerRAGSeed?templateId=${template.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Gagal memanggil endpoint warm-up');
      }

      toast.success('Warm-up Vector DB berhasil diselesaikan!');
    } catch (error: any) {
      console.error('Warm-up Error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat warm-up Vector DB.');
    } finally {
      setIsWarmingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-6 ring-1 ring-slate-800">
        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-indigo-400" />
          Konfigurasi Mode Adaptive (RAG)
        </h3>

        <div className="space-y-6">
          {/* Form Mode Selector */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Mode Formulir Utama</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'standard', label: 'Standard', desc: 'Statis, semua pertanyaan ditentukan di awal' },
                { id: 'adaptive', label: 'Adaptive', desc: 'Sepenuhnya generatif berbasis RAG' },
                { id: 'hybrid', label: 'Hybrid', desc: 'Kombinasi statis dan RAG' }
              ].map(mode => (
                <div
                  key={mode.id}
                  onClick={() => onChange({ ...template, formMode: mode.id as any })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formMode === mode.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                >
                  <h4 className={`text-sm font-bold ${formMode === mode.id ? 'text-indigo-400' : 'text-slate-300'}`}>{mode.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* isAdaptive Checkbox */}
          <label className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 bg-slate-900/40 hover:bg-slate-800 border-indigo-500/30">
            <div className="pt-0.5">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-800"
                checked={isAdaptive}
                onChange={(e) => updateConfig('isAdaptive', e.target.checked)}
              />
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-black text-white flex items-center gap-2">
                Aktifkan Adaptive Living Form (Form Builder Pipeline)
              </h5>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                Jika diaktifkan, saat Anda generate template, AI hanya akan meracik field untuk Step 1 penuh, dan Step sisanya hanya akan berisi judul/deskripsi (tanpa field) sebagai blueprint untuk RAG di runtime.
              </p>
            </div>
          </label>

          {/* Max Sections */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Batas Maksimal Seksi RAG</label>
            <input
              type="number"
              value={maxAdaptiveSections}
              onChange={(e) => updateConfig('maxAdaptiveSections', Number(e.target.value))}
              min={1}
              max={15}
              className="w-full sm:w-32 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Sistem akan berhenti menghasilkan seksi baru jika form telah mencapai batas ini (default: 7).</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 ring-1 ring-slate-800">
        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Manajemen Vector Database (RAG)
        </h3>

        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-200">Pre-warm Vector Database</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Mengekstrak seluruh pertanyaan yang ada di template ini (jika sudah ada isinya) dan menyimpannya ke koleksi <code>adaptive_question_banks</code> sebagai embeddings. Ini mempercepat pencarian RAG saat runtime bagi user.
              </p>
              <Button
                onClick={handleWarmup}
                disabled={isWarmingUp || !template.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
              >
                {isWarmingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses Seeding...
                  </>
                ) : (
                  <>
                    Mulai Warm-up Database
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
