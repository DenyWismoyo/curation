// src/app/admin/assessment/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, Briefcase, ShieldCheck, Loader2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';
import { AdminExportPDF } from '@/app/components/admin/AdminExportPDF';

export default function AdminAssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input'>('evaluasi');

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, 'assessments', params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert('Data asesmen tidak ditemukan.');
          router.push('/admin');
        }
      } catch (error) {
        console.error("Gagal menarik detail data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p className="font-bold tracking-widest text-xs uppercase">Memuat Detail Asesmen...</p>
      </div>
    );
  }

  if (!data) return null;

  const { formData, aiResult, score, readinessLevel, trackType, corporateEntity, status, curatorAssessment, curatorNotes } = data;
  const isCuratorValidated = status === 'Curator_Validated' || curatorAssessment !== undefined;

  const formatKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  // Mencegah error jika format telepon mengandung karakter selain angka
  const waNumber = formData?.telepon ? String(formData.telepon).replace(/[^0-9]/g, '') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER NAVIGASI & IDENTITAS KUNCI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin')} className="w-10 h-10 mt-1 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0">
            <ChevronLeft size={20} />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Preview Mode</p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">{data.namaUsaha || 'Tanpa Nama'}</h1>
            
            {/* INJEKSI KONTAK PESERTA DARI FORMDATA */}
            <div className="flex flex-wrap items-center gap-3">
              {formData?.namaPengisi && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md ring-1 ring-slate-200/50 flex items-center gap-1.5">
                  👤 {formData.namaPengisi}
                </span>
              )}
              {formData?.email && (
                <a href={`mailto:${formData.email}`} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md ring-1 ring-indigo-200/50 flex items-center gap-1.5 transition-colors">
                  <Mail size={12} /> {formData.email}
                </a>
              )}
              {formData?.telepon && (
                <a href={`https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md ring-1 ring-emerald-200/50 flex items-center gap-1.5 transition-colors">
                  <Phone size={12} /> {formData.telepon}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <AdminExportPDF data={data} />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('evaluasi')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'evaluasi' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200'}`}>
          <ShieldCheck className="w-4 h-4"/> Lembar Hasil Evaluasi
        </button>
        <button onClick={() => setActiveTab('input')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200'}`}>
          <Briefcase className="w-4 h-4"/> Data Input Peserta
        </button>
      </div>

      {/* VIEW KONTEN */}
      {activeTab === 'evaluasi' && (
        <UniversalAssessmentView
          mode="admin"
          trackType={trackType}
          corporateEntity={corporateEntity}
          formData={formData}
          aiResult={aiResult}
          curatorData={{
            isEditing: false, 
            curatorScore: curatorAssessment?.verifiedScore || 0,
            curatorLevel: curatorAssessment?.verifiedLevel || readinessLevel || '',
            curatorRoute: curatorAssessment?.finalRoute || '',
            curatorNotes: curatorNotes || '',
            customBlockNotes: curatorAssessment?.customBlockNotes || {},
            documentNotes: curatorAssessment?.documentNotes || '',
            metricsNotes: curatorAssessment?.metricsNotes || '',
            swotNotes: curatorAssessment?.swotNotes || '',
            selectedTags: curatorAssessment?.tags || [],
            isCuratorValidated: isCuratorValidated,
          }}
        />
      )}

      {activeTab === 'input' && (
        <div className="max-w-5xl bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600"/> Data Input Registrasi Peserta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(formData || {}).map(([key, value]) => {
              if (!value) return null;
              // Sembunyikan field identitas dari list jika ingin tampilan yang lebih bersih (karena sudah ada di header)
              if (['namaUsaha', 'namaPengisi', 'email', 'telepon'].includes(key)) return null;

              const isUrl = typeof value === 'string' && value.startsWith('http');
              const isArray = Array.isArray(value);
              return (
                <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{formatKey(key)}</p>
                  {isUrl ? <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">Lihat Lampiran</a> : isArray ? <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div> : <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}