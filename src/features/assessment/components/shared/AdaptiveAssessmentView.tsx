// src/app/components/shared/AdaptiveAssessmentView.tsx
'use client';

import React from 'react';
import { CurationFormData, AIResult } from '@/features/assessment/types/assessment.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Plus, Send, Sparkles, X } from 'lucide-react';
import {
  AiSparkIcon,
  AdminShieldIcon,
  InfinityWorkflowIcon,
  BrainIcon,
} from '@/components/icon';
import { TextToBullets } from './UniversalAssessmentView';
import { PersonalActionPlanCopilot } from '@/features/assessment/components/PersonalActionPlanCopilot';

export interface AdaptiveAssessmentProps {
  formData: CurationFormData | any;
  aiResult: AIResult | any;
  assessmentId?: string;
  headerActions?: React.ReactNode;
  aiPromptConfig?: any;
}

type ExploreMessage = {
  role: 'user' | 'assistant';
  text: string;
};

const DEFAULT_EXPLORE_TASKS = [
  'Prioritas 3 hari ke depan',
  'Cara menenangkan overthinking saat eksekusi',
  'Langkah kecil agar konsisten',
  'Cara minta dukungan dari tim/keluarga',
];

function normalizeTaskText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[\-\d\.)\s]+/, '')
    .trim();
}

function buildExploreReply(prompt: string, aiResult: any): string {
  const shortPrompt = prompt.toLowerCase();
  const firstRisk = aiResult?.riskAssessment?.criticalRisks?.[0];
  const firstStep = aiResult?.nextActionSteps?.[0]?.task;

  if (shortPrompt.includes('overthinking') || shortPrompt.includes('cemas') || shortPrompt.includes('takut')) {
    return 'Wajar kalau Anda merasa berat. Ambil jeda 5 menit, tulis 1 hal yang bisa Anda kontrol hari ini, lalu kerjakan versi paling kecilnya selama 15 menit. Setelah itu, evaluasi singkat: lanjut atau jeda. Fokus pada progres kecil, bukan kesempurnaan.';
  }

  if (shortPrompt.includes('prioritas') || shortPrompt.includes('fokus')) {
    return `Prioritas aman untuk sekarang: 1) jaga ritme harian, 2) selesaikan 1 tugas bernilai tinggi, 3) tutup hari dengan review 5 menit. ${firstStep ? `Saran cepat: mulai dari langkah ini terlebih dahulu: ${firstStep}.` : 'Pilih tugas yang paling memberi dampak dalam 24 jam.'}`;
  }

  if (shortPrompt.includes('tim') || shortPrompt.includes('keluarga') || shortPrompt.includes('dukungan')) {
    return 'Minta dukungan dengan format sederhana: konteks singkat, kebutuhan spesifik, dan batas waktu jelas. Contoh: "Minggu ini saya fokus memperbaiki X, bisa bantu cek progres saya setiap Jumat 10 menit?". Permintaan yang jelas biasanya lebih mudah dibantu.';
  }

  return `Terima kasih sudah berbagi konteks. Fokuskan dulu 1 langkah kecil yang realistis hari ini, lalu ukur hasilnya di akhir hari. ${firstRisk ? `Catatan kehati-hatian: ${firstRisk}.` : 'Jaga ritme agar energi tetap stabil.'}`;
}

function AdaptiveExploreTab({ aiResult }: { aiResult: any }) {
  const [messages, setMessages] = React.useState<ExploreMessage[]>([
    {
      role: 'assistant',
      text: 'Selamat datang di Ruang Eksplorasi AI. Tanyakan apa pun terkait hasil adaptive Anda, saya akan bantu jawab singkat, padat, dan empatik.',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [customTask, setCustomTask] = React.useState('');
  const [tasks, setTasks] = React.useState<string[]>(DEFAULT_EXPLORE_TASKS);
  const [manualPlans, setManualPlans] = React.useState<string[]>([]);
  const [manualPlanInput, setManualPlanInput] = React.useState('');

  const submitQuestion = (question: string) => {
    const cleanQuestion = normalizeTaskText(question);
    if (!cleanQuestion) return;

    const answer = buildExploreReply(cleanQuestion, aiResult);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: cleanQuestion },
      { role: 'assistant', text: answer },
    ]);
    setInput('');
  };

  const addCustomTask = () => {
    const cleanTask = normalizeTaskText(customTask);
    if (!cleanTask) return;
    setTasks((prev) => [cleanTask, ...prev]);
    setCustomTask('');
  };

  const addManualPlan = (plan: string) => {
    const cleanPlan = normalizeTaskText(plan);
    if (!cleanPlan) return;
    setManualPlans((prev) => [cleanPlan, ...prev]);
  };

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      <div className="card-solid/90 backdrop-blur-sm ring-1 ring-border rounded-[2rem] p-5 sm:p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-foreground text-lg font-black tracking-tight">Ruang Eksplorasi AI</h3>
            <p className="text-sm text-muted-foreground font-medium">Konsultasi mandiri berbasis hasil adaptive, dengan jawaban ringkas dan actionable.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="bg-muted text-muted-foreground rounded-2xl ring-1 ring-border/70 p-4 sm:p-5 space-y-3">
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`rounded-2xl p-3.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'card-solid ring-1 ring-border text-slate-700 dark:text-slate-300 dark:text-slate-300' : 'bg-indigo-600 text-white ml-4'}`}>
                  {msg.text}
                  {msg.role === 'assistant' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => addManualPlan(msg.text)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <Plus size={12} /> Tambah jadi rencana manual
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitQuestion(input);
                }}
                placeholder="Tulis pertanyaan Anda..."
                className="flex-1 h-11 rounded-xl border border-border card-solid px-3 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 dark:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => submitQuestion(input)}
                className="h-11 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Send size={14} /> Kirim
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-solid rounded-2xl ring-1 ring-border p-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <MessageCircle size={14} className="text-indigo-500" /> Task Eksplorasi
              </h4>
              <div className="space-y-2 mb-3">
                {tasks.map((task, idx) => (
                  <div key={`${task}-${idx}`} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => submitQuestion(task)}
                      className="flex-1 text-left px-3 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-secondary text-secondary-foreground ring-1 ring-border text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 transition-colors"
                    >
                      {task}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="w-8 h-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-slate-200 text-muted-foreground inline-flex items-center justify-center"
                      aria-label="Hapus task"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomTask();
                  }}
                  placeholder="Tambah task custom..."
                  className="flex-1 h-10 rounded-xl border border-border px-3 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 dark:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={addCustomTask}
                  className="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Tambah
                </button>
              </div>
            </div>

            <div className="card-solid rounded-2xl ring-1 ring-border p-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Rencana Manual</h4>
              <div className="space-y-2 mb-3 max-h-[220px] overflow-y-auto pr-1">
                {manualPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada rencana manual. Anda bisa menambah dari jawaban AI atau input sendiri.</p>
                ) : (
                  manualPlans.map((plan, idx) => (
                    <div key={`${plan}-${idx}`} className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100 text-sm text-emerald-900 dark:text-emerald-300 font-medium">
                      {plan}
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={manualPlanInput}
                  onChange={(e) => setManualPlanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addManualPlan(manualPlanInput);
                      setManualPlanInput('');
                    }
                  }}
                  placeholder="Tambah rencana manual..."
                  className="flex-1 h-10 rounded-xl border border-border px-3 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-200 dark:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    addManualPlan(manualPlanInput);
                    setManualPlanInput('');
                  }}
                  className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-solid/90 backdrop-blur-sm ring-1 ring-border rounded-[2rem] p-5 sm:p-6 shadow-sm">
        <PersonalActionPlanCopilot
          assessmentId={''}
          aiResult={aiResult}
          formData={{}}
        />
      </div>
    </div>
  );
}

export function AdaptiveAssessmentView({
  formData,
  aiResult,
  assessmentId,
  headerActions,
  aiPromptConfig,
}: AdaptiveAssessmentProps) {
  void headerActions;

  const isCounseling = aiResult?.formPurpose === 'counseling';
  const isMonitoring = aiResult?.formPurpose === 'monitoring';
  const displayName = formData?.namaPengisi || formData?.namaUsaha || 'Profil Anda';

  const personalRisks = (aiResult?.riskAssessment?.criticalRisks || []).slice(0, 4);
  const personalMitigations = (aiResult?.riskAssessment?.mitigationStrategies || []).slice(0, 4);
  const quickWins = (aiResult?.nextActionSteps || []).slice(0, 5);
  const motivationalQuote = aiResult?.motivationalQuote || 'Anda tidak harus sempurna hari ini, cukup maju satu langkah kecil dengan konsisten.';
  const keyFocusArea = aiResult?.keyFocusArea || 'Fokuskan energi pada satu prioritas yang paling berdampak untuk 24 jam ke depan.';
  const firstPracticalStep = quickWins?.[0]?.task || 'Mulai dari satu aksi paling ringan selama 15 menit, lalu evaluasi hasilnya.';

  const reportToneLabel = isCounseling
    ? 'Pendekatan empatik dan reflektif'
    : isMonitoring
      ? 'Pendekatan progres dan perbaikan'
      : 'Pendekatan personal dan praktis';

  const reportTitle = isCounseling
    ? 'Laporan Perkembangan Personal'
    : isMonitoring
      ? 'Laporan Progres Personal'
      : 'Laporan Analisis Personal';

  const resultContent = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-6 w-full">
        <div className="card-solid/90 backdrop-blur-sm ring-1 ring-border p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full ring-1 ring-indigo-100">
              <AiSparkIcon size={14} className="text-indigo-500" /> {reportToneLabel}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight text-balance">
              {reportTitle}
            </h1>
            <p className="text-muted-foreground font-medium text-base sm:text-lg leading-relaxed max-w-2xl">
              {displayName} · hasil ini dirancang agar terasa personal, cepat dibaca, dan langsung membantu Anda mengambil langkah berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted text-muted-foreground rounded-2xl p-5 ring-1 ring-border/70">
              <h3 className="text-foreground font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
                <BrainIcon size={16} className="text-indigo-500" /> Ringkasan Eksekutif
              </h3>
              <div className="text-muted-foreground text-sm font-medium leading-relaxed">
                <TextToBullets text={aiResult?.executiveSummary || 'Ringkasan analisis belum tersedia.'} colorClass="text-indigo-500" />
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_40%)]" />
              <div className="relative z-10">
                <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3 text-white/80">
                  <InfinityWorkflowIcon size={16} className="text-emerald-300" /> Fokus Utama
                </h3>
                <p className="text-lg font-black leading-tight tracking-tight text-balance">
                  {keyFocusArea || (isCounseling ? 'Menjaga momentum dan keseimbangan diri' : isMonitoring ? 'Membangun konsistensi progres' : 'Memperjelas langkah paling penting saat ini')}
                </p>
                <p className="text-xs text-white/70 mt-3 leading-relaxed">
                  Ringkasan ini dibuat untuk membantu Anda mengambil keputusan yang lebih mantap dan lebih realistis.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 ring-1 ring-emerald-100">
              <h3 className="text-emerald-800 dark:text-emerald-300 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" /> Kata Motivasi
              </h3>
              <p className="text-sm text-emerald-900 dark:text-emerald-300 font-semibold leading-relaxed">
                {motivationalQuote}
              </p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 ring-1 ring-indigo-100">
              <h3 className="text-indigo-800 dark:text-indigo-300 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
                <AiSparkIcon size={14} className="text-indigo-600 dark:text-indigo-400" /> Langkah Pertama Hari Ini
              </h3>
              <p className="text-sm text-indigo-900 dark:text-indigo-300 font-semibold leading-relaxed">
                {firstPracticalStep}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <PersonalActionPlanCopilot
            assessmentId={assessmentId || ''}
            aiResult={aiResult}
            formData={formData}
            aiPromptConfig={aiPromptConfig}
          />
        </div>
      </div>

      {personalRisks.length > 0 && (
        <div className="p-6 sm:p-8 rounded-[2rem] ring-1 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10 w-full shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <AdminShieldIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-foreground text-xl tracking-tight">Area yang Perlu Dijaga</h3>
              <p className="text-xs text-muted-foreground font-medium mt-1">Disajikan lembut agar mudah diterima dan tidak terasa menghakimi.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalRisks.map((risk: string, idx: number) => (
              <div key={idx} className="flex flex-col ring-1 ring-border rounded-2xl overflow-hidden card-solid shadow-sm">
                <div className="bg-amber-50 dark:bg-amber-500/10 p-4 border-b border-amber-100/60">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Yang Perlu Diwaspadai</h4>
                  <div className="text-sm font-semibold text-foreground">
                    <TextToBullets text={risk} colorClass="text-amber-500" />
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                    <AiSparkIcon size={12} /> Langkah Penyangga
                  </h4>
                  <div className="text-sm font-medium text-muted-foreground">
                    <TextToBullets text={personalMitigations[idx]} colorClass="text-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quickWins.length > 0 && (
        <div className="card-solid ring-1 ring-border p-6 sm:p-8 rounded-[2rem] shadow-sm w-full">
          <h3 className="text-foreground font-black uppercase tracking-widest text-sm flex items-center gap-2 mb-4">
            <BrainIcon size={20} className="text-indigo-500" /> 5 Langkah Strategis Kunci
          </h3>
          <div className="space-y-4">
            {quickWins.map((step: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-black text-foreground">{step.timeframe}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-full">Aksi</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{step.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_38%)] pointer-events-none" />

      <Tabs defaultValue="result" className="w-full">
        <TabsList className="w-full md:w-auto card-solid/80 border border-border rounded-2xl p-1.5 h-auto gap-2">
          <TabsTrigger value="result" className="rounded-xl px-4 py-2.5 text-sm font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            Hasil Adaptive
          </TabsTrigger>
          <TabsTrigger value="explore" className="rounded-xl px-4 py-2.5 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
            <AiSparkIcon size={14} /> Ruang Eksplorasi AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="result" className="mt-6 space-y-6 sm:space-y-8">
          {resultContent}
        </TabsContent>

        <TabsContent value="explore" className="mt-6">
          <AdaptiveExploreTab aiResult={aiResult} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
