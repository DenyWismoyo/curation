'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import { AIPromptPresets } from '@/config/templates/aiPromptTemplates';
import { DomainPresets } from '@/config/templates/domainPresets';
import { Sparkles, Plus, Trash2, ChevronDown, Bot, Loader2, Search, Settings, AlertTriangle, Fingerprint, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase/firebase'; 
import { getAuth } from 'firebase/auth';
import { toast } from 'sonner';

const QUESTION_TYPE_OPTIONS = [
  { id: 'radio_weight', label: 'Skoring Ganda Berbobot', icon: '🎯', rule: 'WAJIB maksimalkan penggunaan tipe "radio" atau "select" dengan array "options" berbobot (weight 0-100) untuk keperluan kalkulasi nilai otomatis.' },
  { id: 'conditional_logic', label: 'Logika Bercabang (ShowIf)', icon: '🔀', rule: 'TERAPKAN INTEROGASI BERLAPIS: Gunakan properti "showIf". Jika peserta merespon klaim besar pada opsi radio/select, WAJIB pancing pertanyaan baru bertipe "file" atau "textarea" untuk menagih bukti.' },
  { id: 'file_upload', label: 'Upload Bukti', icon: '📎', rule: 'WAJIB sertakan tipe input "file" untuk menagih unggahan dokumen bukti (legalitas, laporan, portofolio, dll) guna menekan potensi manipulasi data.' },
  { id: 'number_metric', label: 'Angka & Nominal', icon: '🔢', rule: 'Gunakan tipe "number" secara spesifik untuk menangkap data kuantitatif presisi (seperti Omzet, Jumlah Karyawan, Biaya, Persentase) agar data tidak tercampur teks.' },
  { id: 'text_justification', label: 'Teks Analisa / Alasan', icon: '✍️', rule: 'Gunakan tipe "textarea" secara strategis untuk menuntut penjelasan, justifikasi, keluhan, atau uraian deskriptif yang mendalam dari peserta.' }
];

const ADVANCED_SCENARIOS = [
  { id: 'b2b_audit', label: 'Strict Audit Bisnis (B2B)' },
  { id: 'b2c_counseling', label: 'Empathetic Counseling (B2C)' },
  { id: 'b2e_hybrid', label: 'Hybrid HR & Coaching (B2E)' },
  { id: 'edu_coaching', label: 'Educational / Pelatihan' },
  { id: 'gov_policy', label: 'Audit Tata Kelola Publik (Pemerintah)' },
  { id: 'startup_pitch', label: 'Evaluasi Traksi & Skalabilitas (Startup)' },
  { id: 'creative_portfolio', label: 'Kurasi Portofolio Kreatif & Seni' },
  { id: 'financial_risk', label: 'Analisis Kelayakan Finansial (Investasi)' }
];

const ADAPTIVE_LANGUAGE_PRESETS = [
  { id: 'auto', label: 'Auto (ikuti Tujuan & Audiens)' },
  { id: 'friendly_counseling', label: 'Friendly Konseling Mandiri' },
  { id: 'friendly_self_assessment', label: 'Friendly Asesmen Mandiri' },
  { id: 'warm_supportive', label: 'Hangat & Supportive' },
  { id: 'neutral_professional', label: 'Netral Profesional (ringan)' },
  { id: 'direct_coach', label: 'Coach Tegas (tetap ramah)' },
];

const PROMPT_IMPACT_MODES = [
  { id: 'soft', label: 'Soft (halus, aman, empatik)' },
  { id: 'bold', label: 'Bold (tegas, menjual, energik)' },
  { id: 'aggressive', label: 'Aggressive (high-impact, sangat tajam)' },
];

interface TabAIConfigProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabAIConfig({ template, onChange }: TabAIConfigProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAdvanced, setIsGeneratingAdvanced] = useState(false);
  const [advancedScenario, setAdvancedScenario] = useState('b2c_counseling');
  const [dbStatus, setDbStatus] = useState<{ phase: string; message: string } | null>(null);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [presetSearchTerm, setPresetSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // PERBAIKAN 1: Menyimpan state template terakhir agar bisa dipanggil tanpa memicu re-render
  const templateRef = useRef<FormTemplate>(template);
  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  // PERBAIKAN 2: Flag pintar untuk mengetahui apakah AI sedang jalan atau tidak
  const isWaitingForAI = useRef(false);

  useEffect(() => {
    if (!template.id) return;
    
    const unsubscribe = onSnapshot(doc(db, "form_templates", template.id), (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        const status = docData.aiGenerationStatus;

        if (status) {
          setDbStatus({ phase: status.phase, message: status.message });
          
          const processingPhases = ['INITIATING', 'RESEARCHING', 'FABRICATING', 'VALIDATING', 'PRE_WARMING', 'BUILDING_FORM'];
          
          if (processingPhases.includes(status.phase)) {
            setIsGenerating(true);
            isWaitingForAI.current = true; // Tandai bahwa kita memang sedang menyuruh AI bekerja
          } 
          else if (status.phase === 'COMPLETED' || status.phase === 'FAILED') {
            setIsGenerating(false);
            
            // PERBAIKAN 3: HANYA timpa state lokal dengan database JIKA AI benar-benar baru selesai bekerja
            if (status.phase === 'COMPLETED' && isWaitingForAI.current && docData.aiPromptConfig) {
              onChange({ 
                ...templateRef.current, // Gunakan template terbaru
                aiPromptConfig: docData.aiPromptConfig, 
                steps: docData.steps 
              });
              isWaitingForAI.current = false; // Matikan flag agar perubahan manual berikutnya tidak ditimpa
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [template.id]); // PERBAIKAN 4: Array dependency dibersihkan agar tidak loop

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPresets = AIPromptPresets?.filter(preset => 
      preset.name.toLowerCase().includes(presetSearchTerm.toLowerCase()) || 
      preset.description.toLowerCase().includes(presetSearchTerm.toLowerCase())
  ) || [];

  const toggleQuestionType = (typeId: string) => {
    const currentTypes = template.preferredQuestionTypes || [];
    const newTypes = currentTypes.includes(typeId) 
      ? currentTypes.filter(id => id !== typeId)
      : [...currentTypes, typeId];
    onChange({ ...template, preferredQuestionTypes: newTypes });
  };

  const applyAIPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = AIPromptPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    if (confirm(`Apakah Anda yakin ingin menerapkan preset otak AI:\n"${preset.name}"?`)) {
      onChange({
        ...template,
        aiPromptConfig: {
          ...(template.aiPromptConfig || {}), 
          ...preset.config 
        }
      });
    }
  };

  const handleGenerateUnified = async () => {
    const auth = getAuth();
    if (auth.currentUser?.email?.toLowerCase() !== 'deny.wismoyo@gmail.com') {
      alert("AKSES DITOLAK: Fitur Auto-Research AI ini dikunci eksklusif hanya untuk Administrator Utama.");
      return;
    }

    // Tujuan / Fokus Analisis Utama tidak lagi wajib diisi sebelum di-generate
    // karena ini justru yang akan dibantu digenerate oleh AI berdasarkan konteks lain.
    if (template.steps && template.steps.length > 0) {
      if (!confirm("PERINGATAN: Proses ini akan mereset dan menimpa seluruh langkah form Anda yang ada di Tab Form Builder. Lanjutkan?")) return;
    }

    const audience = template.aiPromptConfig?.targetAudience || 'company';
    let targetContext = "";
    
    if (audience === 'individual' || audience === 'student') {
      targetContext = `TARGET AUDIENS: PERSONAL (${audience.toUpperCase()}). Gunakan kata sapaan langsung (Anda, Bapak/Ibu) dan sesuaikan pertanyaan murni untuk ranah personal. DILARANG KERAS menanyakan aspek perusahaan, organisasi, atau legalitas bisnis.`;
    } else if (audience === 'government') {
      targetContext = `TARGET AUDIENS: INSTANSI PEMERINTAH / PUBLIK. Gunakan bahasa formal birokrasi, tata kelola (governance), dan fokus pada kualitas pelayanan publik.`;
    } else if (audience === 'community') {
      targetContext = `TARGET AUDIENS: KOMUNITAS / YAYASAN. Fokus pada manajemen relawan, dampak sosial, dan program nirlaba.`;
    } else if (audience === 'startup' || audience === 'umkm') {
      targetContext = `TARGET AUDIENS: ${audience.toUpperCase()}. Fokus pada inovasi, pertumbuhan, efisiensi operasional, dan product-market fit.`;
    } else {
      targetContext = `TARGET AUDIENS: KORPORASI / B2B / ORGANISASI. Gunakan bahasa profesional dan metrik skala bisnis enterprise.`;
    }

    let adaptiveInstruction = "";
    if (template.aiPromptConfig?.isAdaptive) {
      const maxSections = template.aiPromptConfig?.maxAdaptiveSections || 10;
      adaptiveInstruction = `
      ==================================================
      PERHATIAN: MODE ADAPTIVE LIVING FORM DIAKTIFKAN!
      ==================================================
      1. Anda WAJIB membuat TEPAT ${maxSections} Seksi kuesioner (Langkah). Abaikan instruksi 5-8 seksi sebelumnya!
      2. Anda WAJIB membuat daftar pertanyaan (fields) SECARA LENGKAP **HANYA UNTUK STEP 1** (Langkah 1).
      3. Untuk Step 2 hingga Step ${maxSections}, Anda WAJIB membuat kerangka seksinya (title dan description) yang mengarahkan pada metrik evaluasi.
      4. SANGAT KRITIS: Untuk Step 2 dan seterusnya, array "fields" atau "draftedQuestions" WAJIB DIBIARKAN KOSONG ([]). JANGAN ISI PERTANYAAN APA PUN di Step 2 ke atas! Pertanyaan untuk seksi tersebut akan dirancang oleh Agen AI lain secara real-time saat peserta mengisi form.
      `;
    }

    let contextAnchor = "";
    if (template.specificTargetContext || template.methodologyContext) {
       contextAnchor = `\n==================================================\nKONTEKS ANCHOR (ACUAN MUTLAK):\n- Profil Subjek Asesmen: ${template.specificTargetContext || 'Umum'}\n- Metodologi/Pendekatan: ${template.methodologyContext || 'Standar Industri Terbaik'}\n==================================================\n`;
    }

    let finalInstruction = contextAnchor + targetContext + "\n\n" + (template.formBuilderInstruction || "Rancang kuesioner penilaian secara sistematis.") + "\n\n" + adaptiveInstruction;

    if (template.preferredQuestionTypes && template.preferredQuestionTypes.length > 0) {
      const selectedRules = template.preferredQuestionTypes.map(id => {
        const opt = QUESTION_TYPE_OPTIONS.find(o => o.id === id);
        return opt ? `- ${opt.rule}` : '';
      }).filter(Boolean).join('\n');
      finalInstruction += `\n\nATURAN KOMPOSISI PERTANYAAN MUTLAK (WAJIB DIPATUHI):\n${selectedRules}`;
    }

    setIsGenerating(true);
    setDbStatus({ phase: "INITIATING", message: "Membangunkan Pipeline Enterprise Multi-Agent AI..." });
    
    try {
      await updateDoc(doc(db, "form_templates", template.id), {
        trackName: template.trackName || "Evaluasi Umum",
        specificTargetContext: template.specificTargetContext || "",
        methodologyContext: template.methodologyContext || "",
        formBuilderInstruction: finalInstruction,
        aiPromptConfig: {
          ...(template.aiPromptConfig || {}),
          promptImpactMode: template.aiPromptConfig?.promptImpactMode || 'bold'
        },
        generationLogs: [],
        aiGenerationStatus: {
          phase: "INITIATING",
          message: "Menghubungi Architect Agent (Gemini 3.1 Pro)...",
          updatedAt: new Date().toISOString()
        }
      });
      
      toast.success("Pipeline AI Diaktifkan!", { 
        description: "Agen AI sedang bekerja di latar belakang. Silakan pantau log terminal." 
      });

    } catch (error: any) {
      console.error(error);
      setIsGenerating(false);
      setDbStatus({ phase: "FAILED", message: error.message || "Gagal memicu agen." });
      toast.error("Gagal", { description: "Gagal menginisiasi pipeline AI." });
    }
  };

  const handleGenerateAdvancedPrompts = async () => {
    setIsGeneratingAdvanced(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateAdvancedFn = httpsCallable(functions, 'generateAdvancedPrompts');
      const payload = {
        trackName: template.trackName,
        specificTargetContext: template.specificTargetContext,
        methodologyContext: template.methodologyContext,
        targetAudience: template.aiPromptConfig?.targetAudience,
        promptImpactMode: template.aiPromptConfig?.promptImpactMode || 'bold',
        scenario: advancedScenario
      };

      const result = await generateAdvancedFn(payload);
      const data = result.data as any;

      if (data.success && data.advancedPrompts) {
        onChange({
          ...template,
          aiPromptConfig: {
            ...(template.aiPromptConfig || {}),
            customScoringRubric: data.advancedPrompts.customScoringRubric,
            customSystemPrompt: data.advancedPrompts.customSystemPrompt,
            negativePrompts: data.advancedPrompts.negativePrompts,
            formatInstructions: data.advancedPrompts.formatInstructions,
            actionPlanBehavior: data.advancedPrompts.actionPlanBehavior
          } as any
        });
        toast.success("Berhasil!", { description: "Kustomisasi Aturan AI (Advanced Prompts) telah berhasil disempurnakan." });
      }
    } catch(e: any) {
      console.error(e);
      toast.error("Gagal Generate", { description: e.message || "Terjadi kesalahan pada server AI." });
    } finally {
      setIsGeneratingAdvanced(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    onChange({ ...template, aiPromptConfig: { ...(template.aiPromptConfig || {}), [key]: value } as any });
  };

  const updateUiLabel = (key: string, value: string) => {
    const currentLabels = template.aiPromptConfig?.customUiLabels || {};
    updateConfig('customUiLabels', { ...currentLabels, [key]: value });
  };

  const updateArrayItem = (key: string, idx: number, value: string) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr[idx] = value;
    updateConfig(key, newArr);
  };

  const removeArrayItem = (key: string, idx: number) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr.splice(idx, 1);
    updateConfig(key, newArr);
  };

  const addArrayItem = (key: string, defaultText: string) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr, defaultText];
    updateConfig(key, newArr);
  };

  const parseAnalysisBlock = (blockStr: string) => {
    if (!blockStr) return { title: '', subs: '' };
    const colonIndex = blockStr.indexOf(':');
    if (colonIndex === -1) return { title: blockStr, subs: '' };
    return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
  };

  const updateAnalysisBlock = (idx: number, newTitle: string, newSubs: string) => {
    const cleanTitle = newTitle.trim();
    const cleanSubs = newSubs.trim();
    const combinedValue = cleanTitle || cleanSubs ? `${cleanTitle}${cleanSubs ? `: ${cleanSubs}` : ''}` : '';
    updateArrayItem('expectedAnalysisBlocks', idx, combinedValue);
  };

  const standardArrayConfigs = [
    { key: 'expectedMetrics', label: 'Metrik Grafik Radar (Penilaian Skor Kuantitatif 0-100)', defaultItem: 'Metrik Baru', description: 'Sebutkan pilar performa atau aspek utama yang akan dikonversi menjadi data grafik Radar.', placeholder: 'Contoh: Kematangan Produk, Rasio Keuangan, Stabilitas Emosional' },
    { key: 'customReadinessTiers', label: 'Klaster Hasil Akhir (Tiers Level)', defaultItem: 'Tier Baru', description: 'Definisikan ambang batas tingkatan status subjek beserta rentang skornya.', placeholder: 'Contoh: Kategori Optimal (Skor 81-100): Kondisi subjek sangat stabil...' },
    { key: 'expectedRecommendations', label: 'Target Rekomendasi Alur Tindak Lanjut', defaultItem: 'Area Rekomendasi', description: 'Tentukan koridor peta jalan tindakan yang wajib dirumuskan oleh kecerdasan buatan.', placeholder: 'Contoh: Intervensi Jangka Pendek (0-1 Bulan)' }
  ];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
       
      {dbStatus && (dbStatus.phase !== 'COMPLETED' && dbStatus.phase !== 'STANDBY') && (
        <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${dbStatus.phase === 'FAILED' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
          {dbStatus.phase === 'FAILED' ? <AlertTriangle className="w-5 h-5 animate-bounce text-rose-600 shrink-0"/> : <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />}
          <div className="flex-1 text-sm">
            <span className="font-black block uppercase tracking-wider text-[11px] opacity-70">Pipeline Enterprise AI ({dbStatus.phase})</span>
            <p className="font-medium mt-0.5">{dbStatus.message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0"><Sparkles className="w-6 h-6"/></div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Arsitektur Otak AI & Komando Form</h3>
            <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Tentukan parameter evaluasi AI di sini. Sekali klik "Generate", sistem akan meriset metrik ini dan otomatis membangun struktur kuesionernya di Tab Form Builder.
            </p>
          </div>
        </div>
        
        <div className="shrink-0 w-full md:w-80 relative z-[60]" ref={dropdownRef}>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Muat Template Otak AI:</label>
          <div 
            onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
            className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 h-10 rounded-xl text-sm px-3 flex items-center justify-between font-bold cursor-pointer hover:bg-indigo-100 shadow-sm"
          >
            <span className="truncate flex-1 text-left opacity-90">{isPresetDropdownOpen ? "Mencari Template..." : "-- Pilih dari 110+ Template --"}</span>
            <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
          </div>

          {isPresetDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 flex flex-col z-[100] overflow-hidden">
              <div className="p-2 border-b border-slate-100 bg-slate-50 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" autoFocus placeholder="Cari preset..." value={presetSearchTerm} onChange={(e) => setPresetSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div className="overflow-y-auto block p-1 bg-white max-h-[240px]">
                {filteredPresets.map(preset => (
                  <button key={preset.id} type="button" onClick={() => { applyAIPreset(preset.id); setIsPresetDropdownOpen(false); setPresetSearchTerm(''); }} className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 group">
                    <span className="text-xs font-black text-slate-700 group-hover:text-indigo-700 line-clamp-1">{preset.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
        <h4 className="font-black text-slate-900 flex items-center gap-2 text-md"><Settings className="w-5 h-5 text-indigo-600" /> Pengaturan Modul Dashboard</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fungsi & Domain Aplikasi Formulir:</label>
            <select 
              value={template.aiPromptConfig?.formPurpose || 'assessment'}
              onChange={(e) => {
                const preset = DomainPresets.find(p => p.id === e.target.value);
                if (preset) {
                  onChange({ ...template, aiPromptConfig: { ...(template.aiPromptConfig || {}), formPurpose: preset.formPurpose, customUiLabels: preset.customUiLabels } as any });
                } else {
                  updateConfig('formPurpose', 'custom');
                }
              }}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold px-3 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
            >
              {DomainPresets.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
              <option value="custom">Kustomisasi Penuh Mandiri (Manual)</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Target Subjek Asesmen:</label>
            <select
              value={template.aiPromptConfig?.targetAudience || 'company'}
              onChange={(e) => updateConfig('targetAudience', e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold px-3 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm cursor-pointer"
            >
              <option value="company">Perusahaan Besar / Korporasi</option>
              <option value="startup">Startup Teknologi / Inovasi</option>
              <option value="umkm">UMKM / Bisnis Menengah</option>
              <option value="government">Instansi Pemerintah / Pelayanan Publik</option>
              <option value="community">Komunitas / NGO / Yayasan</option>
              <option value="individual">Individu / Karir / Personal</option>
              <option value="student">Siswa / Mahasiswa / Akademik</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-white p-3.5 rounded-xl border border-slate-100 font-medium mt-2">
          Saat fungsi dan target diubah, instruksi dasar dan label UI kartu akan menyesuaikan konteksnya.
        </div>
        
        <div className="pt-4 border-t border-slate-200/60 space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Kustomisasi Label Komponen Visual Dashboard (Output):</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
             {['score', 'swot', 'risk', 'roadmap', 'execution'].map((key) => (
               <div key={key} className="space-y-1">
                 <span className="text-[10px] font-bold text-slate-400 capitalize">Label {key}</span>
                 <Input value={(template.aiPromptConfig?.customUiLabels as any)?.[`${key}Label`] || ''} onChange={e => updateUiLabel(`${key}Label`, e.target.value)} placeholder="Default..." className="h-9 text-xs bg-white rounded-lg" />
               </div>
             ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-4 rounded-2xl border bg-white border-slate-200 shadow-sm">
            <label className="text-[10px] font-black uppercase tracking-wider flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                Output Detail Assessment
              </span>
            </label>
            <select
              value={template.aiPromptConfig?.assessmentOutputMode || 'auto'}
              onChange={(e) => updateConfig('assessmentOutputMode', e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold px-3 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
            >
              <option value="auto">Otomatis (ikuti mode assessment)</option>
              <option value="adaptive">Adaptive Assessment View</option>
              <option value="universal">Universal Assessment View</option>
            </select>
            <p className="text-[11px] text-slate-500 font-medium">
              Pilih tampilan hasil yang dipakai user dan admin saat membuka laporan.
            </p>
          </div>

          <div className={`space-y-1.5 p-4 rounded-2xl border transition-all duration-300 ${template.aiPromptConfig?.isAdaptive ? 'bg-indigo-600 border-indigo-700 shadow-lg text-white' : 'bg-indigo-50/50 border-indigo-100'}`}>
            <label className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${template.aiPromptConfig?.isAdaptive ? 'text-indigo-50' : 'text-indigo-900'}`}>
              <span className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${template.aiPromptConfig?.isAdaptive ? 'text-yellow-300' : 'text-indigo-500'}`} /> 
                Mode Asesmen Adaptif (Living Form)
              </span>
              <input type="checkbox" checked={template.aiPromptConfig?.isAdaptive || false} onChange={e => updateConfig('isAdaptive', e.target.checked)} className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            </label>
            <p className={`text-xs font-medium leading-relaxed mt-2 ${template.aiPromptConfig?.isAdaptive ? 'text-indigo-100' : 'text-indigo-700/70'}`}>
              Jika aktif, AI hanya akan merancang field secara utuh untuk Langkah 1. Pertanyaan di langkah berikutnya akan dikosongkan dan di-generate saat user mengisi form.
            </p>
          </div>
          <div className={`space-y-1.5 p-4 rounded-2xl border transition-all duration-300 ${template.aiPromptConfig?.isAdaptive ? 'bg-white border-indigo-300 ring-4 ring-indigo-500/10' : 'bg-slate-50/80 border-slate-200 opacity-60 grayscale-[50%]'}`}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Batas Maksimal Seksi Adaptif</label>
            <Input type="number" min={1} max={15} value={template.aiPromptConfig?.maxAdaptiveSections || 10} onChange={e => updateConfig('maxAdaptiveSections', parseInt(e.target.value))} className="h-10 bg-white font-bold rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400" disabled={!template.aiPromptConfig?.isAdaptive} />
            <p className="text-[11px] text-slate-500 font-medium mt-1">Jumlah limit langkah/seksi (rekomendasi 10-15) saat meracik form dinamis.</p>
          </div>

          <div className={`space-y-1.5 p-4 rounded-2xl border transition-all duration-300 ${template.aiPromptConfig?.isAdaptive ? 'bg-white border-indigo-300 ring-4 ring-indigo-500/10' : 'bg-slate-50/80 border-slate-200 opacity-60 grayscale-[50%]'}`}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Preset Tone Bahasa Adaptive</label>
            <select
              value={template.aiPromptConfig?.adaptiveLanguageStylePreset || 'auto'}
              onChange={(e) => updateConfig('adaptiveLanguageStylePreset', e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold px-3 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
              disabled={!template.aiPromptConfig?.isAdaptive}
            >
              {ADAPTIVE_LANGUAGE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Mode Auto akan membaca Tujuan Form (Tab General) + Target Audiens sebagai default gaya bahasa.</p>
          </div>

          <div className={`space-y-1.5 p-4 rounded-2xl border transition-all duration-300 md:col-span-2 ${template.aiPromptConfig?.isAdaptive ? 'bg-white border-indigo-300 ring-4 ring-indigo-500/10' : 'bg-slate-50/80 border-slate-200 opacity-60 grayscale-[50%]'}`}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Instruksi Tambahan Tone Pertanyaan Adaptive (Opsional)</label>
            <Textarea
              value={template.aiPromptConfig?.adaptiveQuestionTonePrompt || ''}
              onChange={(e) => updateConfig('adaptiveQuestionTonePrompt', e.target.value)}
              placeholder="Contoh: Gunakan bahasa yang membumi, tidak menghakimi, dan hindari istilah teknis berat."
              className="rounded-xl bg-white border-slate-200 min-h-[80px] text-sm font-medium"
              disabled={!template.aiPromptConfig?.isAdaptive}
            />
            <p className="text-[11px] text-slate-500 font-medium">Khusus untuk gaya bahasa saat AI meracik pertanyaan per sesi di Dynamic Wizard.</p>
          </div>

          <div className={`space-y-1.5 p-4 rounded-2xl border transition-all duration-300 md:col-span-2 ${template.aiPromptConfig?.isAdaptive ? 'bg-white border-indigo-300 ring-4 ring-indigo-500/10' : 'bg-slate-50/80 border-slate-200 opacity-60 grayscale-[50%]'}`}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Instruksi Tambahan Tone Hasil Adaptive (Opsional)</label>
            <Textarea
              value={template.aiPromptConfig?.adaptiveResultTonePrompt || ''}
              onChange={(e) => updateConfig('adaptiveResultTonePrompt', e.target.value)}
              placeholder="Contoh: Buat hasil terasa seperti mentor pribadi, ringkas, memotivasi, dan actionable."
              className="rounded-xl bg-white border-slate-200 min-h-[80px] text-sm font-medium"
              disabled={!template.aiPromptConfig?.isAdaptive}
            />
            <p className="text-[11px] text-slate-500 font-medium">Khusus untuk gaya bahasa narasi hasil asesmen adaptive.</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] shadow-xl relative overflow-hidden text-white border border-indigo-800">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10"><Bot size={200} /></div>
        
        <div className="relative z-10 space-y-6">
          <div>
            <h4 className="font-black text-xl sm:text-2xl flex items-center gap-2 mb-2"><Sparkles className="w-6 h-6 text-indigo-400"/> Eksekusi Generasi End-to-End</h4>
            <p className="text-sm text-indigo-200 font-medium max-w-2xl leading-relaxed">
              Tekan tombol di bawah untuk meminta AI menyempurnakan metrik Anda, meracik volume kuesioner, dan membangun seluruh Seksi Form secara otonom.
            </p>
          </div>
          
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-4 backdrop-blur-sm">
             <label className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Komposisi Input Formulir yang Diinginkan:</label>
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
               {QUESTION_TYPE_OPTIONS.map((opt) => {
                 const isChecked = (template.preferredQuestionTypes || []).includes(opt.id);
                 return (
                   <label key={opt.id} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center ${isChecked ? 'border-indigo-400 bg-indigo-500/20 text-white shadow-sm' : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'}`}>
                     <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleQuestionType(opt.id)} />
                     <span className="text-xl mb-1">{opt.icon}</span>
                     <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                   </label>
                 );
               })}
             </div>

             <label className="text-[10px] font-black text-indigo-300 uppercase tracking-wider block mt-4">Instruksi Spesifik Pembentukan Kuesioner (Opsional):</label>
             <Textarea
               value={template.formBuilderInstruction || ''}
               onChange={e => onChange({ ...template, formBuilderInstruction: e.target.value })}
               placeholder="Contoh: 'Wajibkan isian angka berformat Rupiah. Jika peserta memilih PT, gunakan fitur showIf untuk menagih Upload Akta Notaris...'"
               className="min-h-[80px] bg-slate-900 border-slate-700 text-sm font-medium text-white placeholder-slate-500 rounded-xl"
             />
             
             {!isGenerating && (
               <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 mt-4 relative overflow-hidden">
                 {template.aiPromptConfig?.isAdaptive && (
                   <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-sm">
                     ADAPTIVE MODE ON
                   </div>
                 )}
                 <p className="text-[10px] font-black text-indigo-300 uppercase mb-2">Preview Konteks & Aturan AI (Checklist):</p>
                 <p>🎯 <strong className="text-white">Target:</strong> {template.aiPromptConfig?.targetAudience} | {template.aiPromptConfig?.formPurpose}</p>
                 <p>📊 <strong className="text-white">Metrik:</strong> {template.aiPromptConfig?.expectedMetrics?.length || 0} metrik (Radar)</p>
                 <p>🔥 <strong className="text-white">Keketatan:</strong> {template.aiPromptConfig?.gradingStrictness || 'standard'}</p>
                 <p>📝 <strong className="text-white">Komposisi:</strong> {(template.preferredQuestionTypes || []).length > 0 ? (template.preferredQuestionTypes || []).length + ' aturan khusus diaktifkan' : 'Default (Otomatis)'}</p>
                 {template.aiPromptConfig?.isAdaptive && (
                   <p className="mt-3 text-indigo-200 border-t border-slate-700/80 pt-3 flex items-start gap-2">
                     <span className="text-xl leading-none">⚡</span>
                     <span>
                       <strong className="text-white">Living Form Aktif:</strong> AI akan membangun struktur untuk <strong>{template.aiPromptConfig?.maxAdaptiveSections || 10} Seksi</strong> secara berantai. 
                       <br/><span className="text-[10px] opacity-80">(Hanya Step 1 yang akan diisi dengan daftar pertanyaan awal).</span>
                     </span>
                   </p>
                 )}
               </div>
             )}
          </div>

              <Button 
                type="button" // <--- TAMBAHKAN INI
                onClick={handleGenerateUnified} 
                disabled={isGenerating}
                className="w-full font-black h-14 text-base rounded-2xl..."
              >
            {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Sistem Multi-Agent Sedang Bekerja...</> : <><Bot className="w-5 h-5 mr-2"/> Generate Otak AI & Kuesioner Form</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-indigo-600 pl-3">Instruksi Dasar & Karakter AI</h4>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Persona & Peran AI</label>
            <Input value={template.aiPromptConfig?.aiPersona || ''} onChange={e => updateConfig('aiPersona', e.target.value)} placeholder="Contoh: Konselor Psikologi atau Auditor Mutu Internal" className="rounded-xl h-11 bg-slate-50 font-medium border-slate-200" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tujuan / Fokus Analisis Utama</label>
            <Textarea value={template.aiPromptConfig?.assessmentGoal || ''} onChange={e => updateConfig('assessmentGoal', e.target.value)} placeholder="Jelaskan secara mendalam fokus utama pengolahan data oleh AI..." className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px] font-medium text-sm leading-relaxed" />
          </div>
        </div>
        
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Sifat & Perilaku Penilaian</h4>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Keketatan Skor (Grading Strictness)</label>
            <select value={template.aiPromptConfig?.gradingStrictness || 'standard'} onChange={e => updateConfig('gradingStrictness', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none">
              <option value="supportive">Suportif & Edukatif (Skor Cenderung Tinggi)</option>
              <option value="standard">Standar Industri (Objektif / Berimbang)</option>
              <option value="strict">Standar Audit Eksternal (Sangat Ketat & Mencari Celah)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa Laporan (Tone)</label>
            <select value={template.aiPromptConfig?.reportTone || 'consultative'} onChange={e => updateConfig('reportTone', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none">
              <option value="consultative">Konsultatif & Mentor (Solutif & Memberi Opsi)</option>
              <option value="investigative">Investigatif & Analitis (Tajam & Mendeteksi Red Flags)</option>
              <option value="academic">Akademis Formal (Kaku & Berbasis Terminologi Ilmiah)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mode Kualitas Prompt (High Impact)</label>
            <select
              value={template.aiPromptConfig?.promptImpactMode || 'bold'}
              onChange={e => updateConfig('promptImpactMode', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none"
            >
              {PROMPT_IMPACT_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-medium">Soft cocok untuk narasi aman. Bold untuk standar conversion. Aggressive untuk kampanye yang sangat tajam dan punchy.</p>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-blue-500 pl-3">Skala Kepadatan Output</h4>
          <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl ring-1 ring-blue-100">

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Target Blok Analisis</label>
              <Input type="number" min={2} max={15} value={template.aiPromptConfig?.targetBlockCount || 6} onChange={e => updateConfig('targetBlockCount', parseInt(e.target.value))} className="bg-white border-blue-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Jumlah Tingkatan (Tiers)</label>
              <Input type="number" min={2} max={10} value={template.aiPromptConfig?.targetTierCount || 4} onChange={e => updateConfig('targetTierCount', parseInt(e.target.value))} className="bg-white border-blue-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Target Rekomendasi</label>
              <Input type="number" min={2} max={15} value={template.aiPromptConfig?.targetRecommendationCount || 5} onChange={e => updateConfig('targetRecommendationCount', parseInt(e.target.value))} className="bg-white border-blue-200 font-bold" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        <div className="mb-4">
          <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Manajemen Blok Analisis Laporan</h4>
          <p className="text-xs text-slate-500 font-medium mt-1">Sistem AI akan mengekspansi list ini untuk memenuhi Target Jumlah Blok Analisis yang Anda tentukan di atas.</p>
        </div>
        
        <div className="space-y-4">
          {(template.aiPromptConfig?.expectedAnalysisBlocks || []).map((item, idx) => {
            const { title, subs } = parseAnalysisBlock(item);
            return (
              <div key={idx} className="flex gap-4 items-start relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul Blok</label>
                    <Input value={title} onChange={(e) => updateAnalysisBlock(idx, e.target.value, subs)} className="font-black text-slate-800 border-slate-200 bg-slate-50" placeholder="Cth: KESEHATAN FINANSIAL" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Target Sub-Poin</label>
                    <Textarea value={subs} onChange={(e) => updateAnalysisBlock(idx, title, e.target.value)} className="text-sm font-medium border-slate-200 min-h-[60px]" placeholder="Cth: Deskripsikan indikator yang perlu dibedah..." />
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeArrayItem('expectedAnalysisBlocks', idx)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0 mt-6"><Trash2 className="w-4 h-4"/></Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" onClick={() => addArrayItem('expectedAnalysisBlocks', 'Judul Blok Baru: Analisis sub poin pertama')} className="w-full border-dashed border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl h-12 shadow-sm">
            <Plus className="w-5 h-5 mr-2"/> Tambah Kartu Blok Secara Manual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {standardArrayConfigs.map(config => (
            <div key={config.key} className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">{config.label}</label>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">{config.description}</p>
                <div className="space-y-2.5">
                  {(template.aiPromptConfig?.[config.key as keyof typeof template.aiPromptConfig] as string[] || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 group/option">
                      <div className="flex-1 relative">
                        <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <Textarea value={item} onChange={e => updateArrayItem(config.key, idx, e.target.value)} className="pl-7 py-2.5 bg-white border-slate-200 min-h-[65px] rounded-xl text-sm font-medium resize-y" placeholder={config.placeholder} />
                      </div>
                      <Button type="button" variant="ghost" onClick={() => removeArrayItem(config.key, idx)} className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => addArrayItem(config.key, '')} className="w-full mt-3 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-100 rounded-xl h-10 font-bold text-xs"><Plus className="h-4 w-4" /> Tambah Manual</Button>
            </div>
          ))}

          <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">Fokus Kerangka Mitigasi Risiko / Kerentanan Sistematik</label>
            <Textarea value={template.aiPromptConfig?.riskFramework || ''} onChange={e => updateConfig('riskFramework', e.target.value)} placeholder="Petunjuk khusus penanganan red flags atau kelemahan kritis subjek..." className="rounded-xl bg-white border-slate-200 min-h-[100px] text-sm font-medium" />
          </div>
      </div>

      <div className="md:col-span-2 space-y-6 pt-8 border-t border-slate-100">
          
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <h4 className="font-black text-slate-900 border-l-4 border-rose-500 pl-3 text-lg">Advanced Prompting (Ultra-Kustomisasi Aturan)</h4>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
             <select 
               value={advancedScenario} 
               onChange={e => setAdvancedScenario(e.target.value)}
               className="w-full sm:w-64 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl h-10 px-3 focus:ring-1 focus:ring-rose-400"
             >
               {ADVANCED_SCENARIOS.map(sc => (
                 <option key={sc.id} value={sc.id}>{sc.label}</option>
               ))}
             </select>
<Button 
  type="button" // <--- TAMBAHKAN INI
  onClick={handleGenerateAdvancedPrompts}
  disabled={isGeneratingAdvanced}
  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700..."
>
               {isGeneratingAdvanced ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
               AI Enhance
             </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 p-6 bg-amber-50/40 rounded-3xl border border-amber-100 shadow-sm md:col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-black text-amber-900 uppercase tracking-widest">Custom Scoring Rubric (Panduan Kuantifikasi Angka)</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">Menentukan skala & rubrik angka otomatis yang digunakan AI saat mengkalkulasi skor readiness.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              value={template.aiPromptConfig?.customScoringRubric || ''}
              onChange={e => updateConfig('customScoringRubric', e.target.value)}
              placeholder="Definisikan kriteria pemberian nilai matematis dari 0 sampai 100..."
              className="rounded-2xl bg-white border-amber-200 min-h-[100px] text-sm font-medium focus-visible:ring-amber-500" 
            />
          </div>

          <div className="space-y-2 p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100 shadow-sm md:col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">Custom System Rules & Aturan If-Then</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">Gunakan aturan logika JIKA-MAKA untuk mengarahkan penalaran AI secara bertahap.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              value={template.aiPromptConfig?.customSystemPrompt || ''}
              onChange={e => updateConfig('customSystemPrompt', e.target.value)}
              placeholder="Gunakan aturan JIKA-MAKA untuk memandu penalaran langkah demi langkah AI..."
              className="rounded-2xl bg-white border-indigo-200 min-h-[120px] text-sm font-medium focus-visible:ring-indigo-500" 
            />
          </div>

          <div className="space-y-2 p-6 bg-rose-50/40 rounded-3xl border border-rose-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-black text-rose-900 uppercase tracking-widest">Negative Prompts (Pantangan Mutlak AI)</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-rose-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">Instruksi pantangan agar AI tidak mengeluarkan asumsi liar, jargon membingungkan, atau klaim tidak berdasar.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              value={template.aiPromptConfig?.negativePrompts || ''}
              onChange={e => updateConfig('negativePrompts', e.target.value)}
              placeholder="Sebutkan hal-hal yang DILARANG KERAS dikeluarkan dalam narasi evaluasi AI..."
              className="rounded-2xl bg-white border-rose-200 min-h-[100px] text-sm font-medium focus-visible:ring-rose-500" 
            />
          </div>

          <div className="space-y-2 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-black text-emerald-900 uppercase tracking-widest">Format Teks & Markdown Output</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">Aturan struktur layout penulisan laporan seperti bullet points, bolding, dan headings.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              value={template.aiPromptConfig?.formatInstructions || ''}
              onChange={e => updateConfig('formatInstructions', e.target.value)}
              placeholder="Cth: Gunakan penanda **teks tebal** untuk menyoroti istilah penting, *miring* untuk penekanan, dan ### untuk memisahkan sub-topik agar tampilan visual UI lebih rapi..."
              className="rounded-2xl bg-white border-emerald-200 min-h-[100px] text-sm font-medium focus-visible:ring-emerald-500" 
            />
          </div>
          
          <div className="space-y-2 p-6 bg-cyan-50/40 rounded-3xl border border-cyan-100 shadow-sm md:col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-black text-cyan-900 uppercase tracking-widest">Instruksi Khusus Action Plan & Rekomendasi</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">Format langkah aksi konkret yang diproduksi AI (tahapan mingguan, bulanan, atau triwulan).</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              value={template.aiPromptConfig?.actionPlanBehavior || ''}
              onChange={e => updateConfig('actionPlanBehavior', e.target.value)}
              placeholder="Cth (Individu): 'Gunakan bahasa psikologi yang empatik, berikan tugas ringan harian seperti jurnaling atau meditasi. Dilarang memberi tugas bisnis.'&#10;Cth (B2B): 'Tugas harus taktis, fokus pada metrik ROI dan perbaikan SOP.'"
              className="rounded-2xl bg-white border-cyan-200 min-h-[100px] text-sm font-medium focus-visible:ring-cyan-500" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}