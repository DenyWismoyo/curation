// src/app/components/assessor/AssessorManualEditor.tsx
'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  X, Briefcase, BrainCircuit, Save, 
  Loader2, Edit3, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CuratorExportPDF } from '@/features/curator/components/PDFReportTemplate';
import { AppModal, AppTabs } from '@/components/ui/design-system';

interface AssessorManualEditorProps {
  data: any;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function AssessorManualEditor({ data, onClose, onSaveSuccess }: AssessorManualEditorProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'ai'>('input');
  const [isSaving, setIsSaving] = useState(false);

  // Clone data dari database ke state lokal untuk diedit tanpa menyentuh server
  const [localFormData, setLocalFormData] = useState<any>(data.formData || {});
  const [localAiResult, setLocalAiResult] = useState<any>(data.aiResult || data.originalAiResult || {});

  // Merapikan nama key (misal: "namaUsaha" jadi "Nama Usaha")
  const formatKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  // Helper untuk mengubah array (seperti SWOT) menjadi teks baris-baru dan sebaliknya
  const arrayToText = (arr: any) => Array.isArray(arr) ? arr.join('\n') : String(arr || '');
  const textToArray = (text: string) => text.split('\n').map(s => s.trim()).filter(s => s !== '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'assessments', data.id);
      
      const payload = {
        formData: localFormData,
        aiResult: localAiResult,
        namaUsaha: localFormData.namaUsaha || data.namaUsaha,
        score: Number(localAiResult.totalScore) || data.score,
        readinessLevel: localAiResult.readinessLevel || data.readinessLevel,
        status: 'Curator_Validated', // Status otomatis berubah selesai
        validatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, payload);
      toast.success("Perubahan manual berhasil disimpan!");
      onSaveSuccess();
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      toast.error("Gagal menyimpan perubahan ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppModal
      open={true}
      onClose={onClose}
      size="2xl"
      hideCloseButton={true}
      header={
        <div className="bg-white px-6 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" /> Editor Manual Asesor
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Ubah data input dan hasil evaluasi tanpa memotong kuota token AI.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="ghost" className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      }
    >
        {/* Tab Navigasi */}
        <div className="bg-white border-b border-slate-200 shrink-0 overflow-x-auto pt-2">
          <AppTabs
            active={activeTab}
            onChange={(val: any) => setActiveTab(val)}
            variant="underline"
            tabs={[
              { id: 'input', label: 'Koreksi Data Peserta', icon: <Briefcase className="w-4 h-4"/> },
              { id: 'ai', label: 'Edit Hasil Evaluasi (Tanpa AI)', icon: <BrainCircuit className="w-4 h-4"/> },
            ]}
          />
        </div>

        {/* Area Kerja (Work Area) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* TAB 1: EDIT FORM DATA PESERTA */}
          {activeTab === 'input' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-bold">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                Perubahan pada kolom ini akan menggantikan input asli dari peserta di dalam database.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(localFormData).map(([key, value]) => {
                  const isArray = Array.isArray(value);
                  const isLongText = typeof value === 'string' && value.length > 60;
                  
                  return (
                    <div key={key} className={`space-y-1.5 ${key === 'namaUsaha' || isLongText ? 'md:col-span-2' : ''}`}>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{formatKey(key)}</label>
                      {isArray ? (
                        <Input 
                          value={(value as string[]).join(', ')} 
                          onChange={(e) => setLocalFormData({...localFormData, [key]: e.target.value.split(',').map(s => s.trim())})}
                          className="bg-white border-slate-200 font-medium"
                          placeholder="Pisahkan nilai dengan koma (,)"
                        />
                      ) : isLongText ? (
                        <Textarea 
                          value={value as string}
                          onChange={(e) => setLocalFormData({...localFormData, [key]: e.target.value})}
                          className="bg-white border-slate-200 font-medium min-h-[100px]"
                        />
                      ) : (
                        <Input 
                          value={String(value || '')}
                          onChange={(e) => setLocalFormData({...localFormData, [key]: e.target.value})}
                          className="bg-white border-slate-200 font-medium"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT HASIL AI */}
          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-bold mb-4">
                <ShieldAlert className="w-5 h-5 shrink-0 text-emerald-600" />
                Simpan perubahan di sini, lalu cetak PDF untuk mendapatkan laporan resmi dengan redaksi manual Anda.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Skor Akhir (0-100)</label>
                  <Input 
                    type="number" 
                    value={localAiResult.totalScore || 0} 
                    onChange={(e) => setLocalAiResult({...localAiResult, totalScore: Number(e.target.value)})}
                    className="bg-white border-slate-200 font-black text-lg text-indigo-600 h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Level Kesiapan (Maturity)</label>
                  <Input 
                    value={localAiResult.readinessLevel || ''} 
                    onChange={(e) => setLocalAiResult({...localAiResult, readinessLevel: e.target.value})}
                    className="bg-white border-slate-200 font-bold h-12"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kesimpulan Rute / Rekomendasi Utama</label>
                  <Input 
                    value={localAiResult.incubationRoute || ''} 
                    onChange={(e) => setLocalAiResult({...localAiResult, incubationRoute: e.target.value})}
                    className="bg-white border-slate-200 font-medium h-12"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Executive Summary (Ringkasan Eksekutif)</label>
                  <Textarea 
                    value={localAiResult.executiveSummary || ''} 
                    onChange={(e) => setLocalAiResult({...localAiResult, executiveSummary: e.target.value})}
                    className="bg-white border-slate-200 font-medium min-h-[160px]"
                  />
                </div>
              </div>

              {/* EDITOR SWOT (Jika ada) */}
              {localAiResult.swotAnalysis && (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Analisis Matriks (SWOT)</h3>
                  <p className="text-[10px] text-slate-500 font-medium -mt-2">Setiap baris baru (Enter) akan menjadi satu poin di laporan PDF.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {['strengths', 'weaknesses', 'opportunities', 'threats'].map((key) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                        <Textarea 
                          value={arrayToText(localAiResult.swotAnalysis[key])} 
                          onChange={(e) => setLocalAiResult({
                            ...localAiResult, 
                            swotAnalysis: {
                              ...localAiResult.swotAnalysis,
                              [key]: textToArray(e.target.value)
                            }
                          })}
                          className="bg-white border-slate-200 font-medium min-h-[120px] text-xs leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          
          <div className="w-full sm:w-auto">
            {/* Tombol Ekspor PDF yang mengambil state form lokal secara Real-time */}
            <CuratorExportPDF 
              assessmentId={data.id}
              trackType={data.trackType}
              formData={localFormData}
              aiResult={localAiResult}
              namaUsaha={localFormData.namaUsaha || data.namaUsaha}
              liveData={{
                curatorScore: Number(localAiResult.totalScore) || 0,
                curatorLevel: localAiResult.readinessLevel || '',
                curatorRoute: localAiResult.incubationRoute || '',
                curatorNotes: '' 
              }}
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="font-bold rounded-xl h-11 w-full sm:w-auto">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-8 shadow-sm w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Simpan Pembaruan
            </Button>
          </div>
        </div>
    </AppModal>
  );
}