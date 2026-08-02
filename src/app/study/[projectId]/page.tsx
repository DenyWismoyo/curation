'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, FileText, Loader2, RefreshCw, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type Chapter = {
  id: string;
  chapterId: string;
  chapterNumber: number;
  title: string;
  content?: string;
  draftStatus: string;
  auditStatus?: string;
  citationCoverageScore?: number;
  consistencyScore?: number;
  auditFindings?: Array<{
    severity: string;
    issue: string;
    recommendation: string;
  }>;
  citations?: Array<{
    sourceId: string;
    claim: string;
    supportingSnippet: string;
  }>;
};

const ALLOWED_ROLES = new Set(['study_author', 'study_reviewer', 'admin_omnifit', 'admin_csrs']);

export default function StudyProjectViewer() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { user, role, loading } = useAuth();

  const [projectData, setProjectData] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  
  const [isExporting, setIsExporting] = useState(false);

  const hasAccess = role ? ALLOWED_ROLES.has(role) : false;

  useEffect(() => {
    if (!user || !hasAccess || !projectId) return;

    const projectUnsub = onSnapshot(doc(db, 'study_projects', projectId), (docSnap) => {
      if (docSnap.exists()) {
        setProjectData(docSnap.data());
      }
    });

    const chaptersQuery = query(collection(db, 'study_projects', projectId, 'chapters'), orderBy('chapterNumber', 'asc'));
    const chaptersUnsub = onSnapshot(chaptersQuery, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Chapter));
      setChapters(fetched);
      if (fetched.length > 0 && !activeChapterId) {
        setActiveChapterId(fetched[0].id);
      }
    });

    return () => {
      projectUnsub();
      chaptersUnsub();
    };
  }, [user, hasAccess, projectId, activeChapterId]);

  if (loading || (!projectData && hasAccess)) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold mt-4">Akses Ditolak</h1>
          <button onClick={() => router.push('/study')} className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl font-bold">Kembali</button>
        </div>
      </div>
    );
  }

  const activeChapter = chapters.find(c => c.id === activeChapterId);
  
  const handleRequestRevision = async () => {
    if (!activeChapterId || !revisionNote.trim()) return;
    setIsSubmittingRevision(true);
    setRevisionError('');
    try {
      const callable = httpsCallable(functions, 'requestChapterRevision');
      await callable({
        projectId,
        chapterId: activeChapterId,
        reviewerNotes: revisionNote,
      });
      setShowRevisionModal(false);
      setRevisionNote('');
    } catch (error: any) {
      console.error(error);
      setRevisionError(error.message || 'Terjadi kesalahan saat meminta revisi.');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const callable = httpsCallable(functions, 'exportStudyDocument');
      const result = await callable({ projectId });
      const data = result.data as { success: boolean; downloadUrl: string };
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error: any) {
      console.error(error);
      alert('Gagal mengekspor dokumen: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/study')} className="p-2 hover:bg-stone-100 rounded-full text-stone-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">{projectData?.title || 'Loading...'}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-0.5">Document Viewer • {projectData?.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {projectData?.reviewStatus === 'READY_FOR_REVIEW' && (
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="h-10 px-4 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isExporting ? 'Mengekspor...' : 'Export Dokumen'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-stone-50 border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-stone-200">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Daftar Bab</p>
          </div>
          <div className="p-3 space-y-1">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${activeChapterId === chapter.id ? 'bg-white ring-1 ring-stone-300 shadow-sm' : 'hover:bg-stone-100 text-stone-600'}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${activeChapterId === chapter.id ? 'text-violet-700' : 'text-stone-400'}`} />
                  <div>
                    <p className={`text-sm font-bold leading-snug ${activeChapterId === chapter.id ? 'text-slate-900' : ''}`}>{chapter.chapterNumber}. {chapter.title}</p>
                    {chapter.auditStatus && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {chapter.auditStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> Needs Review
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {chapters.length === 0 && (
              <div className="text-xs text-stone-500 text-center py-6">Belum ada bab yang dihasilkan.</div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeChapter ? (
            <div className="max-w-4xl mx-auto p-8 lg:p-12">
              <div className="mb-8 pb-8 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{activeChapter.title}</h2>
                  <button 
                    onClick={() => setShowRevisionModal(true)}
                    disabled={activeChapter.draftStatus === 'REVISING'}
                    className="h-9 px-4 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {activeChapter.draftStatus === 'REVISING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                    {activeChapter.draftStatus === 'REVISING' ? 'Revising...' : 'Minta Revisi'}
                  </button>
                </div>
                
                {/* Audit Findings Panel */}
                {activeChapter.auditFindings && activeChapter.auditFindings.length > 0 && (
                  <div className="mt-6 bg-amber-50 rounded-2xl ring-1 ring-amber-200 p-5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Temuan Auditor
                    </h3>
                    <div className="mt-4 space-y-3">
                      {activeChapter.auditFindings.map((finding, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-amber-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${finding.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                              {finding.severity}
                            </span>
                            <p className="text-sm font-bold text-slate-900">{finding.issue}</p>
                          </div>
                          <p className="text-xs text-slate-600">{finding.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Markdown Content */}
              <div className="prose prose-slate max-w-none prose-headings:font-black prose-a:text-violet-600 prose-a:font-bold hover:prose-a:text-violet-700 prose-img:rounded-xl">
                {activeChapter.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeChapter.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-stone-400 italic">Konten bab sedang ditulis atau belum tersedia.</p>
                )}
              </div>
              
              {/* Citations Footer */}
              {activeChapter.citations && activeChapter.citations.length > 0 && (
                <div className="mt-16 pt-8 border-t border-stone-200">
                  <h4 className="text-sm font-black uppercase tracking-widest text-stone-500 mb-4">Referensi & Sitasi yang Digunakan</h4>
                  <div className="space-y-4">
                    {activeChapter.citations.map((cit, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-bold text-slate-800">[SRC:{cit.sourceId}] {cit.claim}</p>
                        <p className="text-stone-500 text-xs mt-1 border-l-2 border-stone-300 pl-3 italic">"{cit.supportingSnippet}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full text-stone-400 font-medium">
              Pilih bab dari sidebar untuk membaca
            </div>
          )}
        </div>
      </div>
      
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h3 className="font-black text-slate-900">Minta Revisi Bab</h3>
              <button onClick={() => setShowRevisionModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-600">Berikan catatan yang spesifik (misalnya data yang salah, bagian yang perlu diperluas, atau nada bahasa yang kurang pas). Agen akan mempertimbangkan seluruh knowledge base dan catatan Anda untuk menulis ulang bab ini.</p>
              
              <textarea 
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Catatan revisi..."
                className="w-full min-h-[120px] p-3 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-violet-500 outline-none"
              />
              
              {revisionError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">
                  {revisionError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 font-bold text-sm text-stone-600 hover:bg-stone-200 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={handleRequestRevision}
                disabled={isSubmittingRevision || !revisionNote.trim()}
                className="px-4 py-2 font-bold text-sm text-white bg-violet-700 hover:bg-violet-800 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingRevision ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Kirim Permintaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
