'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, FileText, Loader2, RefreshCw, X, Globe, FileUp, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, functions, storage } from '@/lib/firebase/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

type Chapter = {
  id: string;
  chapterId: string;
  chapterNumber: number;
  title: string;
  content?: string;
  draftStatus: string;
  auditStatus?: string;
  currentAction?: string;
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
  const [sources, setSources] = useState<any[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  
  type SupplementalSource = { type: 'url' | 'file' | 'ai_search'; url?: string; storagePath?: string; fileName?: string; aiMaterial?: string; title?: string; };
  const [supplementalSources, setSupplementalSources] = useState<SupplementalSource[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingMaterial, setIsGeneratingMaterial] = useState(false);
  
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

    const sourcesQuery = collection(db, 'study_projects', projectId, 'sources');
    const sourcesUnsub = onSnapshot(sourcesQuery, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setSources(fetched);
    });

    return () => {
      projectUnsub();
      chaptersUnsub();
      sourcesUnsub();
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
      const callable = httpsCallable(functions, 'requestChapterRevision', { timeout: 540000 }); // 9 menit timeout untuk client
      await callable({
        projectId,
        chapterId: activeChapterId,
        reviewerNotes: revisionNote,
        supplementalSources
      });
      setShowRevisionModal(false);
      setRevisionNote('');
      setSupplementalSources([]);
    } catch (error: any) {
      console.error(error);
      setRevisionError(error.message || 'Terjadi kesalahan saat meminta revisi.');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleAddUrl = () => {
    if (newUrl.trim() && newUrl.startsWith('http')) {
      setSupplementalSources(prev => [...prev, { type: 'url', url: newUrl.trim() }]);
      setNewUrl('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const storagePath = `study_projects/${projectId}/supplemental/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      setSupplementalSources(prev => [...prev, { type: 'file', storagePath, fileName: file.name }]);
    } catch (error) {
      console.error(error);
      alert('Gagal upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAiMaterial = async () => {
    if (!activeChapterId) return;
    setIsGeneratingMaterial(true);
    try {
      const callable = httpsCallable(functions, 'generateRevisionMaterials', { timeout: 300000 });
      const result = await callable({ projectId, chapterId: activeChapterId });
      const data = result.data as { success: boolean; aiMaterial: string; foundUrls?: string[] };
      setSupplementalSources(prev => [
        ...prev, 
        { type: 'ai_search', title: 'Materi Pencarian AI Otomatis', aiMaterial: data.aiMaterial },
        ...(data.foundUrls || []).map(url => ({ type: 'url' as const, url }))
      ]);
    } catch (error: any) {
      console.error(error);
      alert('Gagal mencari bahan dengan AI: ' + error.message);
    } finally {
      setIsGeneratingMaterial(false);
    }
  };

  const handleRemoveSource = (index: number) => {
    setSupplementalSources(prev => prev.filter((_, i) => i !== index));
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

  const processSourceText = (text: string) => {
    if (!text) return text;
    return text.replace(/\[SRC:([a-zA-Z0-9_-]+)(?:\s*\|\s*Chunk\s*\d+)?\]/g, (match, id) => {
      const source = sources.find(s => s.id === id);
      return source ? `[SRC: ${source.title}]` : match;
    });
  };

  const processContent = (content: string, citations?: any[]) => {
    if (!content) return "";
    let processed = content;
    
    if (citations && citations.length > 0) {
      citations.forEach((cit, idx) => {
        // We use a regex to replace [SRC:sourceId] globally with a neat superscript link
        // Adding a space before to ensure it doesn't merge with words, although LLM might output it with space.
        // We output markdown superscript using HTML <sup> since ReactMarkdown supports it if rehypeRaw is used,
        // but since we only have remarkGfm, standard markdown link `[[1]](#cit-1)` is safer and works well.
        const regex = new RegExp(`\\[SRC:${cit.sourceId}\\]`, 'g');
        processed = processed.replace(regex, ` [[${idx + 1}]](#cit-${idx})`);
      });
    }
    
    // Clean up any dangling [SRC:...] that the LLM hallucinated
    processed = processed.replace(/\[SRC:[a-zA-Z0-9_-]+\]/gi, ''); 
    
    // Add extra newlines before headings if missing, for better markdown rendering
    processed = processed.replace(/([^\n])\n(#)/g, '$1\n\n$2');
    
    return processed;
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
          {projectData?.status === 'READY_FOR_REVIEW' && (
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
            {projectData?.status === 'FAILED' && projectData?.orchestration?.errors && projectData.orchestration.errors.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <div className="font-bold flex items-center gap-1.5 mb-2 uppercase tracking-wider text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> Error Log
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {projectData.orchestration.errors.map((err: any, idx: number) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-rose-100">
                      <p className="font-bold text-[10px] uppercase text-rose-500">{err.phase}</p>
                      <p className="mt-1 font-mono text-[9px] leading-tight break-words">{err.message}</p>
                      {err.createdAt && <p className="mt-1 text-[8px] text-rose-400">{new Date(err.createdAt).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${activeChapterId === chapter.id ? 'bg-white ring-1 ring-stone-300 shadow-sm' : 'hover:bg-stone-100 text-stone-600'}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${activeChapterId === chapter.id ? 'text-violet-700' : 'text-stone-400'}`} />
                  <div>
                    <p className={`text-sm font-bold leading-snug ${activeChapterId === chapter.id ? 'text-slate-900' : ''}`}>{chapter.chapterNumber === 0 ? '' : `${chapter.chapterNumber}. `}{chapter.title}</p>
                    {chapter.currentAction ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> {chapter.currentAction}
                        </span>
                      </div>
                    ) : chapter.auditStatus ? (
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
                    ) : null}
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
                    disabled={['REVISING', 'REVISION_REQUESTED'].includes(activeChapter.draftStatus)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold rounded-xl border border-stone-200 shadow-sm disabled:opacity-50"
                  >
                    {['REVISING', 'REVISION_REQUESTED'].includes(activeChapter.draftStatus) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                    {['REVISING', 'REVISION_REQUESTED'].includes(activeChapter.draftStatus) ? 'Revising...' : 'Minta Revisi'}
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
                            <p className="text-sm font-bold text-slate-900">{processSourceText(finding.issue)}</p>
                          </div>
                          <p className="text-xs text-slate-600">{processSourceText(finding.recommendation)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Markdown Content */}
              <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-10 prose-h3:text-xl prose-p:text-stone-700 prose-p:leading-relaxed prose-a:text-violet-600 prose-a:font-bold prose-a:no-underline hover:prose-a:text-violet-700 hover:prose-a:underline prose-img:rounded-xl">
                {activeChapter.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {processContent(activeChapter.content, activeChapter.citations)}
                  </ReactMarkdown>
                ) : (
                  <p className="text-stone-400 italic">Konten bab sedang ditulis atau belum tersedia.</p>
                )}
              </div>
              
              {/* Citations Footer */}
              {activeChapter.citations && activeChapter.citations.length > 0 && (
                <div className="mt-16 pt-8 border-t border-stone-200">
                  <h4 className="text-sm font-black uppercase tracking-widest text-stone-500 mb-6">Referensi & Sitasi yang Digunakan</h4>
                  <div className="space-y-5">
                    {activeChapter.citations.map((cit, idx) => (
                      <div key={idx} id={`cit-${idx}`} className="text-sm bg-stone-50 rounded-xl p-4 border border-stone-100 hover:border-stone-200 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-black text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 leading-snug">{cit.claim}</p>
                            <div className="mt-2 text-stone-500 text-xs border-l-2 border-violet-200 pl-3 italic bg-white p-2 rounded-r-lg">
                              "{cit.supportingSnippet}"
                            </div>
                            <p className="text-[10px] uppercase font-bold text-stone-400 mt-2 tracking-wider">
                              ID Sumber: {cit.sourceId}
                            </p>
                          </div>
                        </div>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="font-black text-slate-900">Minta Revisi Bab</h3>
              <button onClick={() => setShowRevisionModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-stone-600">Berikan catatan yang spesifik (misalnya data yang salah, bagian yang perlu diperluas, atau nada bahasa yang kurang pas). Agen akan mempertimbangkan seluruh knowledge base dan catatan Anda untuk menulis ulang bab ini.</p>
              
              <textarea 
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Catatan revisi..."
                className="w-full min-h-[120px] p-3 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-violet-500 outline-none"
              />
              
              <div className="pt-4 border-t border-stone-200">
                <h4 className="text-xs font-black uppercase text-stone-500 mb-3">Referensi Tambahan (Opsional)</h4>
                
                {supplementalSources.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {supplementalSources.map((src, idx) => (
                      <div key={idx} className="flex flex-col bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
                        <div className="flex items-center justify-between p-2.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {src.type === 'url' ? <Globe className="w-4 h-4 text-sky-600 shrink-0" /> : src.type === 'file' ? <FileUp className="w-4 h-4 text-rose-600 shrink-0" /> : <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {src.type === 'url' ? src.url : src.type === 'file' ? src.fileName : src.title}
                            </p>
                          </div>
                          <button onClick={() => handleRemoveSource(idx)} className="text-stone-400 hover:text-rose-500 p-1 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {src.type === 'ai_search' && src.aiMaterial && (
                          <div className="px-3 pb-3">
                            <div className="p-2.5 bg-white border border-stone-100 rounded-lg max-h-[120px] overflow-y-auto text-[10px] text-stone-600 whitespace-pre-wrap font-mono">
                              {src.aiMaterial}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex-1 min-w-[200px] flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Masukkan URL/Link..." 
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                      className="flex-1 text-xs px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                    <button onClick={handleAddUrl} disabled={!newUrl.trim()} className="px-3 py-2 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 rounded-lg text-xs font-bold text-stone-700">Add URL</button>
                  </div>
                  
                  <label className="px-3 py-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-xs font-bold text-stone-700 cursor-pointer flex items-center gap-1.5 shrink-0">
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                    Upload File
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.csv" onChange={handleFileUpload} disabled={isUploading} />
                  </label>

                  <button 
                    onClick={handleGenerateAiMaterial}
                    disabled={isGeneratingMaterial}
                    className="px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isGeneratingMaterial ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Cari via AI
                  </button>
                </div>
              </div>
              
              {revisionError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">
                  {revisionError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-3 shrink-0">
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
