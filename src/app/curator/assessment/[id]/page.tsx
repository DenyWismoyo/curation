'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, Briefcase, ShieldCheck, Loader2, Edit3, CheckCircle2, MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalAssessmentView } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { logCuratorAuditEvent } from '@/lib/b2b-curator-audit';

// IMPORT KOMPONEN EXPORT
import { CuratorExportPDF } from '@/app/components/curator/PDFReportTemplate';

export default function CuratorAssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterTags, setMasterTags] = useState<string[]>([]);

  // State UI
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input'>('evaluasi');
  const [isEditing, setIsEditing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialRender = useRef(true);

  // State Kurator Form
  const [curatorScore, setCuratorScore] = useState<number>(0);
  const [curatorLevel, setCuratorLevel] = useState<string>('');
  const [curatorRoute, setCuratorRoute] = useState<string>('');
  const [curatorNotes, setCuratorNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customBlockNotes, setCustomBlockNotes] = useState<Record<string, string>>({});
  const [documentNotes, setDocumentNotes] = useState<string>('');
  const [metricsNotes, setMetricsNotes] = useState<string>('');
  const [swotNotes, setSwotNotes] = useState<string>('');
  const auditOpenLoggedRef = useRef(false);

  const hasRoleAccess = (currentRole: string | null): boolean => (
    currentRole === 'curator' || currentRole === 'assessor' || currentRole === 'admin_csrs' || currentRole === 'admin_omnifit'
  );

  const toStringArray = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!user || !hasRoleAccess(role)) {
        router.replace('/curator');
        return;
      }
      if (!params.id) return;
      try {
        const docRef = doc(db, 'assessments', params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = { id: docSnap.id, ...docSnap.data() } as any;

          const userDocByUid = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
          const userDocByEmail = user.email ? await getDoc(doc(db, 'users', user.email)).catch(() => null) : null;
          const profile = userDocByUid?.data() || userDocByEmail?.data() || {};

          const organizationScopes = Array.from(new Set([
            ...toStringArray(profile.allowedOrganizations),
            ...toStringArray(profile.organizationScopes),
            ...toStringArray(profile.accessibleOrganizations),
          ]));

          const targetOrganization = typeof d.corporateEntity === 'string' ? d.corporateEntity : '';
          const isAdmin = role === 'admin_csrs' || role === 'admin_omnifit';
          const allowedByScope = targetOrganization ? organizationScopes.includes(targetOrganization) : false;

          if (!isAdmin && !allowedByScope && role !== 'assessor') {
            alert('Akses ditolak. Anda tidak memiliki scope untuk organization ini.');
            router.replace('/curator/dashboard');
            return;
          }

          setData(d);
          
          const aiRes = d.aiResult || {};
          setCuratorScore(d.curatorAssessment?.verifiedScore || aiRes.totalScore || 0);
          setCuratorLevel(d.curatorAssessment?.verifiedLevel || aiRes.readinessLevel || '');
          setCuratorRoute(d.curatorAssessment?.finalRoute || aiRes.incubationRoute || '');
          setCuratorNotes(d.curatorNotes || '');
          setSelectedTags(d.curatorAssessment?.tags || []);
          setCustomBlockNotes(d.curatorAssessment?.customBlockNotes || {});
          setDocumentNotes(d.curatorAssessment?.documentNotes || '');
          setMetricsNotes(d.curatorAssessment?.metricsNotes || '');
          setSwotNotes(d.curatorAssessment?.swotNotes || '');

          if (!auditOpenLoggedRef.current && user) {
            auditOpenLoggedRef.current = true;
            const action = d.status === 'Curator_Validated' ? 'open_assessment' : 'open_draft';
            logCuratorAuditEvent({
              action,
              userId: user.uid,
              userEmail: user.email || '',
              role: role || 'unknown',
              corporateEntity: typeof d.corporateEntity === 'string' ? d.corporateEntity : 'unknown',
              assessmentId: d.id,
              assessmentStatusBefore: typeof d.status === 'string' ? d.status : '',
              routePath: `/curator/assessment/${d.id}`,
            }).catch((error) => {
              console.warn('Gagal menyimpan audit log open curator assessment:', error);
            });
          }

          if (d.corporateEntity) {
            const tagsDocRef = doc(db, 'corporate_tags', d.corporateEntity);
            const tagsSnap = await getDoc(tagsDocRef);
            if (tagsSnap.exists()) setMasterTags(tagsSnap.data().tags || []);
          }
        } else {
          alert('Data asesmen tidak ditemukan.');
          router.push('/curator/dashboard');
        }
      } catch (error) {
        console.error("Gagal menarik detail data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, params.id, role, router, user]);

  // AUTOSAVE LOGIC
  useEffect(() => {
    if (isInitialRender.current) { isInitialRender.current = false; return; }
    if (!isEditing || !data) return;

    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'assessments', data.id);
        const payload: any = {
          curatorNotes, score: Number(curatorScore), readinessLevel: curatorLevel,
          status: data.status === 'Curator_Validated' ? 'Curator_Validated' : 'Curator_Draft',
          updatedAt: new Date().toISOString(),
          curatorAssessment: { verifiedScore: Number(curatorScore), verifiedLevel: curatorLevel, finalRoute: curatorRoute, tags: selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes }
        };
        await updateDoc(docRef, payload);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) { setAutoSaveStatus('error'); }
    }, 2500); 

    return () => clearTimeout(timer);
  }, [curatorScore, curatorLevel, curatorRoute, curatorNotes, selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes, isEditing, data]);

  const handleFinalize = async () => {
    if (!curatorNotes.trim()) return alert('Catatan Validasi Lapangan Utama WAJIB diisi untuk melakukan Finalisasi.');
    if (!confirm('Apakah Anda yakin ingin memfinalisasi data validasi? Setelah difinalisasi, status akan berubah menjadi Selesai.')) return;
    
    setIsFinalizing(true);
    try {
      const docRef = doc(db, 'assessments', data.id);
      await updateDoc(docRef, {
        curatorNotes, score: Number(curatorScore), readinessLevel: curatorLevel,
        status: 'Curator_Validated', validatedAt: new Date().toISOString(),
        curatorAssessment: { verifiedScore: Number(curatorScore), verifiedLevel: curatorLevel, finalRoute: curatorRoute, tags: selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes }
      });

      if (user) {
        await logCuratorAuditEvent({
          action: 'finalize_assessment',
          userId: user.uid,
          userEmail: user.email || '',
          role: role || 'unknown',
          corporateEntity: typeof data.corporateEntity === 'string' ? data.corporateEntity : 'unknown',
          assessmentId: data.id,
          assessmentStatusBefore: typeof data.status === 'string' ? data.status : '',
          details: {
            finalizedScore: Number(curatorScore),
            finalizedLevel: curatorLevel,
            tagCount: selectedTags.length,
          },
          routePath: `/curator/assessment/${data.id}`,
        }).catch((error) => {
          console.warn('Gagal menyimpan audit log finalize curator:', error);
        });
      }

      alert('Data telah difinalisasi secara permanen!');
      router.push('/curator/dashboard');
    } catch (error) { alert('Gagal terhubung ke database.'); } finally { setIsFinalizing(false); }
  };

  const handleShareWhatsApp = () => {
    const phone = data.formData?.whatsapp || '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const textMessage = `Halo tim *${data.namaUsaha}*,\n\nTerima kasih telah mengikuti tahapan Kurasi bersama kami. Berikut ringkasan hasil akhir:\n\n*Skor Kesiapan Akhir:* ${curatorScore}/100\n*Level Kesiapan:* ${curatorLevel}\n\n*Catatan Kurator:*\n_"${curatorNotes || 'Terus tingkatkan kapasitas bisnis Anda.'}"_\n\nSalam hangat,\n*Tim Penilai*`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`, '_blank');
  };

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
      <p className="font-bold tracking-widest text-xs uppercase">Mempersiapkan Workspace Kurator...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24">
        
        {/* HEADER NAVIGASI */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm sticky top-4 z-40 w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/curator/dashboard')} className="w-10 h-10 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">Workspace Kurator   {data.trackType}</p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{data.namaUsaha}</h1>
            </div>
          </div>
          
          {/* AKSI GLOBAL */}
          <div className="flex flex-wrap items-center gap-2">
            {isEditing && (
                <div className="hidden sm:flex items-center mr-4 text-[10px] font-bold uppercase tracking-widest">
                  {autoSaveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Menyimpan...</span>}
                  {autoSaveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3"/> Draf Tersimpan</span>}
                </div>
            )}
            
            {/* 🎯 TOMBOL EXPORT PDF DITAMBAHKAN DI SINI */}
            <CuratorExportPDF 
              assessmentId={data.id}
              trackType={data.trackType}
              formData={data.formData}
              aiResult={data.aiResult || {}}
              namaUsaha={data.namaUsaha}
              liveData={{
                curatorScore,
                curatorLevel,
                curatorRoute,
                curatorNotes
              }}
            />

            <Button onClick={handleShareWhatsApp} variant="outline" className="bg-white text-emerald-600 border-emerald-200 rounded-xl font-bold h-10 px-4 shadow-sm">
              <MessageCircle className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Bagikan</span>
            </Button>
            {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-4 shadow-md">
                  <Edit3 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Validasi Manual</span>
                </Button>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl h-10 px-4 font-bold border-slate-200 text-slate-600">Tutup Editor</Button>
                  <Button onClick={handleFinalize} disabled={isFinalizing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-10 px-4 shadow-md">
                    <CheckCircle2 className="w-4 h-4 mr-2"/> Finalisasi
                  </Button>
                </>
              )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 w-full">
          <button onClick={() => setActiveTab('evaluasi')} className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'evaluasi' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm'}`}>
            <ShieldCheck className="w-4 h-4"/> Modul Evaluasi Lapangan
          </button>
          <button onClick={() => setActiveTab('input')} className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm'}`}>
            <Briefcase className="w-4 h-4"/> Data Input Peserta
          </button>
        </div>

        {/* VIEW KONTEN */}
        {activeTab === 'evaluasi' && (
          <UniversalAssessmentView
            mode="curator"
            trackType={data.trackType}
            corporateEntity={data.corporateEntity}
            formData={data.formData}
            aiResult={data.aiResult || {}}
            curatorData={{
              isEditing,
              curatorScore, setCuratorScore,
              curatorLevel, setCuratorLevel,
              curatorRoute, setCuratorRoute,
              curatorNotes, setCuratorNotes,
              customBlockNotes, setCustomBlockNotes: (t, v) => setCustomBlockNotes(p => ({...p, [t]: v})),
              documentNotes, setDocumentNotes,
              metricsNotes, setMetricsNotes,
              swotNotes, setSwotNotes,
              selectedTags, toggleTag: (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag]),
              availableTags: masterTags,
              isCuratorValidated: data.status === 'Curator_Validated',
            }}
          />
        )}

        {activeTab === 'input' && (
          <div className="w-full bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600"/> Detail Informasi Bisnis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(data.formData || {}).map(([key, value]) => {
                if (!value) return null;
                const isUrl = typeof value === 'string' && value.startsWith('http');
                const isArray = Array.isArray(value);
                return (
                  <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                    {isUrl ? <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Lampiran</a> : isArray ? <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div> : <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}