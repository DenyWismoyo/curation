// src/components/curator/CuratorAssessmentDetail.tsx
'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  X, Briefcase, Sparkles, AlertTriangle, TrendingUp, 
  Activity, Lightbulb, Route, Save, Edit3, CheckCircle2,
  ListChecks, ShieldCheck, FileText, Loader2, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface CuratorAssessmentDetailProps {
  data: any;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function CuratorAssessmentDetail({ data, onClose, onSaveSuccess }: CuratorAssessmentDetailProps) {
  const { formData, id, trackType, namaUsaha } = data;
  
  // Ambil data AI terbaru (jika sudah diedit sebelumnya, ambil yang sudah diedit)
  const currentAiResult = data.aiResult || {};
  const isAlreadyValidated = data.curatorNotes !== undefined;

  // --- STATE UNTUK MODE VIEW / EDIT ---
  const [activeTab, setActiveTab] = useState<'ai' | 'input'>('ai');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- FORM STATE (Diiisi dengan nilai bawaan AI atau hasil edit sebelumnya) ---
  const [editedScore, setEditedScore] = useState<number>(currentAiResult.totalScore || data.score || 0);
  const [editedLevel, setEditedLevel] = useState<string>(currentAiResult.readinessLevel || data.readinessLevel || '');
  const [editedRoute, setEditedRoute] = useState<string>(currentAiResult.incubationRoute || '');
  const [curatorNotes, setCuratorNotes] = useState<string>(data.curatorNotes || '');

  // SWOT State (Gabungkan array jadi string dengan newline untuk kemudahan edit)
  const [swot, setSwot] = useState({
    strengths: (currentAiResult.swotAnalysis?.strengths || []).join('\n'),
    weaknesses: (currentAiResult.swotAnalysis?.weaknesses || []).join('\n'),
    opportunities: (currentAiResult.swotAnalysis?.opportunities || []).join('\n'),
    threats: (currentAiResult.swotAnalysis?.threats || []).join('\n'),
  });

  // Action Plan State
  const [actionSteps, setActionSteps] = useState<any[]>(currentAiResult.nextActionSteps || []);

  const formatKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  // Handle Save ke Firestore
  const handleSaveValidation = async () => {
    if (!curatorNotes.trim()) {
      setErrorMsg('Catatan Validasi Lapangan WAJIB diisi sebelum menyimpan.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');

    try {
      const docRef = doc(db, 'assessments', id);
      
      // Parse kembali SWOT dari text menjadi array
      const parsedSWOT = {
        strengths: swot.strengths.split('\n').filter((s: string) => s.trim() !== ''),
        weaknesses: swot.weaknesses.split('\n').filter((s: string) => s.trim() !== ''),
        opportunities: swot.opportunities.split('\n').filter((s: string) => s.trim() !== ''),
        threats: swot.threats.split('\n').filter((s: string) => s.trim() !== '')
      };

      // Siapkan payload
      const payload: any = {
        curatorNotes: curatorNotes,
        aiResult: {
          ...currentAiResult,
          totalScore: Number(editedScore),
          readinessLevel: editedLevel,
          incubationRoute: editedRoute,
          swotAnalysis: parsedSWOT,
          nextActionSteps: actionSteps
        },
        status: 'Curator_Validated',
        validatedAt: new Date().toISOString()
      };

      // Simpan jejak audit (original AI Result) HANYA JIKA belum pernah divalidasi
      if (!data.originalAiResult) {
        payload.originalAiResult = currentAiResult;
      }

      await updateDoc(docRef, payload);
      alert('Data validasi berhasil disimpan!');
      onSaveSuccess(); // Trigger refresh di dashboard
    } catch (error) {
      console.error('Gagal menyimpan validasi:', error);
      setErrorMsg('Gagal terhubung ke database. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActionStepChange = (index: number, field: 'timeframe' | 'task', value: string) => {
    const newSteps = [...actionSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setActionSteps(newSteps);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-6xl h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="bg-white px-6 py-5 sm:px-8 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{namaUsaha}</h2>
              {isAlreadyValidated && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={12}/> Divalidasi
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2">
              <MapPin size={14}/> {formData.kota || 'Lokasi tidak diketahui'} • {trackType}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">
                <Edit3 className="w-4 h-4 mr-2" /> Mulai Validasi / Koreksi
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl font-bold">
                Batal Edit
              </Button>
            )}
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors" title="Tutup Panel">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 px-6 sm:px-8 pt-4 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Validasi Asesmen AI</span>
          </button>
          <button onClick={() => setActiveTab('input')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Mentah Peserta</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {/* TAB: DATA MENTAH */}
          {activeTab === 'input' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {Object.entries(formData || {}).map(([key, value]) => {
                if (!value) return null;
                const isUrl = typeof value === 'string' && value.startsWith('http');
                return (
                  <div key={key} className="bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{formatKey(key)}</p>
                    {isUrl ? (
                      <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Lampiran</a>
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{String(value)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: VALIDASI AI */}
          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              
              {/* AREA WAJIB: CATATAN KURATOR */}
              <div className={`p-6 sm:p-8 rounded-[2rem] shadow-sm ring-2 transition-all ${isEditing ? 'bg-white ring-indigo-400 shadow-indigo-100' : 'bg-slate-100 ring-slate-200'}`}>
                <h3 className="font-black text-slate-900 text-lg mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600"/> Catatan Validasi Lapangan / Field Check Notes
                </h3>
                <p className="text-sm text-slate-500 mb-4 font-medium">Tuliskan temuan lapangan, justifikasi perubahan skor, dan catatan internal di sini.</p>
                {isEditing ? (
                  <Textarea 
                    value={curatorNotes} 
                    onChange={(e) => setCuratorNotes(e.target.value)} 
                    placeholder="Contoh: Setelah dilakukan wawancara, ternyata tim sangat solid namun laporan keuangannya belum rapi..." 
                    className="min-h-[150px] bg-slate-50 rounded-xl border-slate-300 focus:border-indigo-500 text-sm font-medium"
                  />
                ) : (
                  <div className="bg-white p-4 rounded-xl ring-1 ring-slate-200 min-h-[100px] text-sm text-slate-700 whitespace-pre-wrap font-medium">
                    {curatorNotes || <span className="italic text-slate-400">Belum ada catatan validasi lapangan. Klik tombol "Mulai Validasi" untuk menambahkan.</span>}
                  </div>
                )}
                {errorMsg && <p className="text-rose-500 text-sm font-bold mt-3">{errorMsg}</p>}
              </div>

              {/* AREA SKOR & LEVEL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Penilaian Utama</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Total Score (0-100)</label>
                      {isEditing ? (
                        <Input type="number" min="0" max="100" value={editedScore} onChange={(e) => setEditedScore(Number(e.target.value))} className="font-black text-xl text-indigo-700 bg-indigo-50 border-indigo-200" />
                      ) : (
                        <div className="font-black text-4xl text-slate-800">{editedScore}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Readiness Level</label>
                      {isEditing ? (
                        <Input value={editedLevel} onChange={(e) => setEditedLevel(e.target.value)} className="font-bold bg-slate-50" />
                      ) : (
                        <div className="font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-lg inline-block">{editedLevel}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Route className="w-5 h-5 text-emerald-500"/> Rute Inkubasi & Timeline</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Rekomendasi Rute</label>
                      {isEditing ? (
                        <Input value={editedRoute} onChange={(e) => setEditedRoute(e.target.value)} className="font-bold bg-slate-50" />
                      ) : (
                        <div className="font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg inline-block">{editedRoute || "Belum ditentukan"}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AREA SWOT */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-indigo-600"/> Evaluasi SWOT (Pisahkan dengan Enter)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={14}/> Strengths</label>
                    {isEditing ? (
                      <Textarea value={swot.strengths} onChange={(e) => setSwot({...swot, strengths: e.target.value})} className="min-h-[120px] bg-emerald-50/50" />
                    ) : (
                      <ul className="list-disc pl-4 text-sm font-medium text-slate-700 space-y-1 bg-slate-50 p-4 rounded-xl min-h-[120px]">
                        {swot.strengths.split('\n').map((s, i) => s.trim() && <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                  {/* Weaknesses */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={14}/> Weaknesses</label>
                    {isEditing ? (
                      <Textarea value={swot.weaknesses} onChange={(e) => setSwot({...swot, weaknesses: e.target.value})} className="min-h-[120px] bg-rose-50/50" />
                    ) : (
                      <ul className="list-disc pl-4 text-sm font-medium text-slate-700 space-y-1 bg-slate-50 p-4 rounded-xl min-h-[120px]">
                        {swot.weaknesses.split('\n').map((s, i) => s.trim() && <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                  {/* Opportunities */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Lightbulb size={14}/> Opportunities</label>
                    {isEditing ? (
                      <Textarea value={swot.opportunities} onChange={(e) => setSwot({...swot, opportunities: e.target.value})} className="min-h-[120px] bg-blue-50/50" />
                    ) : (
                      <ul className="list-disc pl-4 text-sm font-medium text-slate-700 space-y-1 bg-slate-50 p-4 rounded-xl min-h-[120px]">
                        {swot.opportunities.split('\n').map((s, i) => s.trim() && <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                  {/* Threats */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={14}/> Threats</label>
                    {isEditing ? (
                      <Textarea value={swot.threats} onChange={(e) => setSwot({...swot, threats: e.target.value})} className="min-h-[120px] bg-amber-50/50" />
                    ) : (
                      <ul className="list-disc pl-4 text-sm font-medium text-slate-700 space-y-1 bg-slate-50 p-4 rounded-xl min-h-[120px]">
                        {swot.threats.split('\n').map((s, i) => s.trim() && <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* AREA ACTION PLAN */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2 text-lg"><ListChecks className="w-5 h-5 text-indigo-600"/> Action Plan Timeline</h4>
                <div className="space-y-4">
                  {actionSteps.map((step: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-xl ring-1 ring-slate-100">
                      <div className="w-full sm:w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Timeframe</label>
                        {isEditing ? (
                          <Input value={step.timeframe} onChange={(e) => handleActionStepChange(idx, 'timeframe', e.target.value)} className="bg-white font-bold" />
                        ) : (
                          <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-black text-xs uppercase tracking-widest rounded-md">{step.timeframe}</div>
                        )}
                      </div>
                      <div className="w-full sm:w-2/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tugas / Task</label>
                        {isEditing ? (
                          <Textarea value={step.task} onChange={(e) => handleActionStepChange(idx, 'task', e.target.value)} className="bg-white font-medium min-h-[80px]" />
                        ) : (
                          <p className="text-sm font-semibold text-slate-700">{step.task}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOMBOL SAVE (HANYA MUNCUL SAAT EDIT) */}
              {isEditing && (
                <div className="sticky bottom-0 p-4 bg-white/80 backdrop-blur-md ring-1 ring-slate-200 rounded-2xl flex justify-end gap-3 z-10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl font-bold px-6">Batal</Button>
                  <Button onClick={handleSaveValidation} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 shadow-lg shadow-emerald-200">
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Menyimpan...</> : <><Save className="w-4 h-4 mr-2"/> Simpan Validasi Lapangan</>}
                  </Button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}