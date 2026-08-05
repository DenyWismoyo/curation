'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2, BookOpenText, ShieldCheck, UploadCloud, Sparkles, FileText, Database, Globe, FileUp, HardDrive } from 'lucide-react';
import { auth, db, functions, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type StudyProject = {
  id: string;
  authorId?: string;
  authorEmail?: string;
  memberIds?: string[];
  reviewerIds?: string[];
  reviewStatus?: string;
  reviewSummary?: {
    summary?: string;
    crossChapterRisks?: string[];
    reviewerFocus?: string[];
  } | null;
  title: string;
  researchQuestion: string;
  status: string;
  sourceStats?: {
    total?: number;
    indexed?: number;
    failed?: number;
  };
  outline?: {
    chapters?: Array<{ chapterId: string; title: string }>;
  } | null;
  orchestration?: {
    phase?: string;
    completedPhases?: string[];
  };
};

const ALLOWED_ROLES = new Set(['study_author', 'study_reviewer', 'admin_omnifit', 'admin_csrs']);
const MANAGER_ROLES = new Set(['study_author', 'admin_omnifit', 'admin_csrs']);

const extractDriveFileId = (url: string) => {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
};

const sanitizeFileName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default function StudyWorkspacePage() {
  const { user, role, isPremium, loading, loginWithGoogle, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researchQuestion, setResearchQuestion] = useState('');
  const [targetPages, setTargetPages] = useState(100);
  const [writingTone, setWritingTone] = useState<'academic' | 'consultative' | 'investigative'>('academic');
  const [isCryptoMode, setIsCryptoMode] = useState(false);
  
  const [submittingProject, setSubmittingProject] = useState(false);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [startingPipeline, setStartingPipeline] = useState(false);
  const [approvingOutline, setApprovingOutline] = useState(false);
  const [sourceNote, setSourceNote] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [driveUrl, setDriveUrl] = useState('');
  const [importingDrive, setImportingDrive] = useState(false);
  
  const [publishingToAcademy, setPublishingToAcademy] = useState(false);
  const [academyLevel, setAcademyLevel] = useState('Level 1: Pemula');
  const [academyAssessmentId, setAcademyAssessmentId] = useState('');

  const hasStudyAccess = (role ? ALLOWED_ROLES.has(role) : false) || isPremium;
  const canManageProjects = role ? MANAGER_ROLES.has(role) : false;

  useEffect(() => {
    if (!user || !hasStudyAccess) {
      return;
    }

    const projectQuery = query(
      collection(db, 'study_projects'),
      where('memberIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(projectQuery, (snapshot) => {
      const nextProjects = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<StudyProject, 'id'>) }));

      setProjects(nextProjects);
      if (!selectedProjectId && nextProjects[0]) {
        setSelectedProjectId(nextProjects[0].id);
      }
    });

    return () => unsubscribe();
  }, [user, hasStudyAccess, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSources([]);
      return;
    }
    const sourcesRef = collection(db, 'study_projects', selectedProjectId, 'sources');
    const sourcesQuery = query(sourcesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(sourcesQuery, (snapshot) => {
      setSources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const isCurrentProjectManager = !!user && !!selectedProject && (canManageProjects || selectedProject.authorId === user.uid);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    try {
      await loginWithEmail(email.trim(), password);
    } catch (loginError: unknown) {
      console.error('Login study gagal:', loginError);
      setError('Login gagal. Periksa email/password atau hubungi admin untuk role study_author.');
    }
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmittingProject(true);

    try {
      const callable = httpsCallable(functions, 'createStudyProject');
      const response = await callable({
        title,
        description,
        researchQuestion,
        targetPages,
        writingTone,
      });
      const data = response.data as { projectId: string };
      setSelectedProjectId(data.projectId);
      setTitle('');
      setDescription('');
      if (!isCryptoMode) {
        setResearchQuestion('');
        setTargetPages(100);
        setWritingTone('academic');
      }
    } catch (projectError: unknown) {
      console.error('Gagal membuat project study:', projectError);
      setError(getErrorMessage(projectError, 'Gagal membuat project kajian.'));
    } finally {
      setSubmittingProject(false);
    }
  };

  const processSourceFiles = async (files: File[]) => {
    if (!files || files.length === 0 || !user || !selectedProjectId) {
      return;
    }

    setError('');
    setUploadingSource(true);

    try {
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file) => {
          const safeName = sanitizeFileName(file.name);
          const storagePath = `study_kb/${user.uid}/${selectedProjectId}/${Date.now()}_${Math.random().toString(36).substring(7)}_${safeName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(storageRef);

          const callable = httpsCallable(functions, 'registerStudySource');
          await callable({
            projectId: selectedProjectId,
            title: file.name.replace(/\.[^.]+$/, ''),
            kind: 'file',
            storagePath,
            downloadUrl,
            contentType: file.type,
            fileName: file.name,
            fileSize: file.size,
            summaryHint: sourceNote,
          });
        }));
      }

      setSourceNote('');
    } catch (uploadError: unknown) {
      console.error('Gagal upload source study:', uploadError);
      setError(getErrorMessage(uploadError, 'Gagal upload batch source knowledge base.'));
    } finally {
      setUploadingSource(false);
    }
  };

  const handleUploadSource = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      await processSourceFiles(Array.from(event.target.files));
      event.target.value = '';
    }
  };

  const handleGoogleDriveImport = async () => {
    if (!driveUrl.trim() || !user || !selectedProjectId) return;
    
    const fileId = extractDriveFileId(driveUrl);
    if (!fileId) {
      setError('Format URL Google Drive tidak valid.');
      return;
    }

    setError('');
    setImportingDrive(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        throw new Error("Tidak bisa mendapatkan akses token Google Drive.");
      }

      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!metaRes.ok) {
        throw new Error("Gagal mengakses file Google Drive. Pastikan file ada dan izin memadai.");
      }
      
      const metadata = await metaRes.json();
      
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      let fileName = metadata.name;
      let mimeType = metadata.mimeType;

      if (mimeType === 'application/vnd.google-apps.document') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
        fileName = `${fileName}.pdf`;
        mimeType = 'application/pdf';
      }

      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!fileRes.ok) {
        throw new Error("Gagal mendownload konten file dari Google Drive.");
      }

      const blob = await fileRes.blob();
      const file = new File([blob], fileName, { type: mimeType });
      
      await processSourceFiles([file]);
      setDriveUrl('');
      
    } catch (err: unknown) {
      console.error('Gagal import dari Google Drive:', err);
      setError(getErrorMessage(err, 'Gagal mengimpor dari Google Drive.'));
    } finally {
      setImportingDrive(false);
    }
  };

  const handleStartPipeline = async () => {
    if (!selectedProjectId) {
      return;
    }

    const isConfirmed = window.confirm("Apakah Anda yakin ingin menjalankan ulang pipeline dari awal (Ingestion + Writer + Auditor)? Proses ini akan memakan waktu dan mengulang dari tahap awal.");
    if (!isConfirmed) {
      return;
    }

    setError('');
    setStartingPipeline(true);

    try {
      const callable = httpsCallable(functions, 'startStudyProjectPipeline');
      await callable({ projectId: selectedProjectId });
    } catch (pipelineError: unknown) {
      console.error('Gagal start pipeline study:', pipelineError);
      setError(getErrorMessage(pipelineError, 'Gagal memulai pipeline kajian.'));
    } finally {
      setStartingPipeline(false);
    }
  };

  const handleApproveOutline = async () => {
    if (!selectedProjectId) return;
    setError('');
    setApprovingOutline(true);

    try {
      const callable = httpsCallable(functions, 'approveStudyOutline');
      await callable({ projectId: selectedProjectId });
    } catch (err: unknown) {
      console.error('Gagal menyetujui outline:', err);
      setError(getErrorMessage(err, 'Gagal menyetujui outline.'));
    } finally {
      setApprovingOutline(false);
    }
  };

  const handlePublishToAcademy = async () => {
    if (!selectedProjectId) return;
    setError('');
    setPublishingToAcademy(true);

    try {
      const callable = httpsCallable(functions, 'publishStudyToCryptoAcademy');
      await callable({ 
        projectId: selectedProjectId,
        level: academyLevel,
        assessmentTemplateId: academyAssessmentId || undefined,
      });
      alert('Berhasil mempublikasikan ke Crypto Academy!');
    } catch (err: unknown) {
      console.error('Gagal mempublikasikan:', err);
      setError(getErrorMessage(err, 'Gagal mempublikasikan ke Crypto Academy.'));
    } finally {
      setPublishingToAcademy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center text-slate-600">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan workspace kajian...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f0eadf,_#f7f4ee_50%,_#ece6da)] px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] bg-white ring-1 ring-stone-200 shadow-2xl overflow-hidden">
          <div className="p-7 bg-stone-900 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em]">
              <BookOpenText className="w-4 h-4" /> Study Workspace
            </div>
            <h1 className="text-2xl font-black mt-4">Login Portal Kajian</h1>
            <p className="text-sm text-stone-200 mt-2">Ruang kerja penulisan kajian multi-agent dengan knowledge base internal.</p>
          </div>

          <div className="p-7 space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </label>
              {error ? <div className="rounded-xl bg-rose-50 text-rose-700 text-sm p-3 ring-1 ring-rose-200">{error}</div> : null}
              <button type="submit" className="w-full h-11 rounded-xl bg-stone-900 hover:bg-amber-700 text-white font-black text-sm">Login via Email</button>
            </form>

            <button type="button" onClick={loginWithGoogle} className="w-full h-11 rounded-xl bg-white text-slate-700 border border-slate-200 font-black text-sm">
              Login via Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasStudyAccess) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] px-4 py-12">
        <div className="max-w-3xl mx-auto rounded-[2rem] bg-white shadow-xl ring-1 ring-stone-200 p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-900 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em]">
            <ShieldCheck className="w-4 h-4" /> Akses Premium
          </div>
          <h1 className="text-3xl font-black text-slate-900 mt-4">Akses workspace studi belum aktif</h1>
          <p className="text-slate-600 font-medium mt-3 leading-relaxed mb-6">Fitur Study Analytics dan Knowledge Base ini eksklusif untuk pelanggan Premium. Dapatkan insight bisnis B2B mendalam dengan berlangganan sekarang.</p>
          <Link href="/crypto">
            <button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm">
              Upgrade Premium
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] px-4 py-8 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <section className="rounded-[2rem] bg-white ring-1 ring-stone-200 shadow-sm p-6 space-y-5 h-fit">
          {canManageProjects ? (
            <>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Blueprint Kajian</p>
                <h1 className="text-2xl font-black text-slate-900 mt-2">Buat Project Baru</h1>
                <p className="text-sm text-slate-500 font-medium mt-2">Pipeline sekarang mencakup extraction, chunking, outline, drafting bab, dan audit otomatis awal.</p>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
                  <input 
                    type="checkbox" 
                    id="cryptoMode" 
                    checked={isCryptoMode} 
                    onChange={(e) => {
                      setIsCryptoMode(e.target.checked);
                      if (e.target.checked) {
                        setResearchQuestion("Bagaimana cara terbaik menjelaskan [TOPIK] kepada trader crypto pemula Indonesia?");
                        setTargetPages(15);
                        setWritingTone("consultative");
                      } else {
                        setResearchQuestion("");
                        setTargetPages(100);
                        setWritingTone("academic");
                      }
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="cryptoMode" className="text-sm font-bold text-amber-900 flex items-center gap-1 cursor-pointer select-none">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Aktifkan Mode Pembuatan Crypto Academy
                  </label>
                </div>

                <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Judul kajian" className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsi singkat konteks kajian" className="w-full min-h-[88px] rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                <textarea value={researchQuestion} onChange={(event) => setResearchQuestion(event.target.value)} required placeholder="Pertanyaan riset utama" className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Gaya Penulisan</span>
                    <select value={writingTone} onChange={(e) => setWritingTone(e.target.value as any)} className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white">
                      <option value="academic">Akademis (Formal)</option>
                      <option value="consultative">Konsultatif (Mudah Dipahami)</option>
                      <option value="investigative">Investigatif (Mendalam)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Target halaman</span>
                    <input value={targetPages} onChange={(event) => setTargetPages(Number(event.target.value || 100))} min={5} max={200} type="number" className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                </div>
                <button type="submit" disabled={submittingProject} className="w-full h-11 rounded-xl bg-stone-900 hover:bg-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {submittingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Buat Project Kajian
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Reviewer Workspace</p>
              <h1 className="text-2xl font-black text-slate-900">Dashboard Review Kajian</h1>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Akun `study_reviewer` dapat membaca project yang sudah dimasukkan ke `memberIds`, meninjau status audit, dan memfokuskan review manual pada bab yang sudah ditandai sistem.</p>
            </div>
          )}

          {error ? <div className="rounded-xl bg-rose-50 text-rose-700 text-sm p-3 ring-1 ring-rose-200">{error}</div> : null}

          <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200 text-xs text-stone-600 leading-relaxed">
            <p className="font-black uppercase tracking-[0.14em] text-stone-900 mb-2">State Machine Studi</p>
            <p>DRAFT -&gt; INDEXING_SOURCES -&gt; GENERATING_OUTLINE -&gt; REVIEWING_OUTLINE -&gt; PLANNING_CHAPTERS -&gt; WRITING_CHAPTERS -&gt; AUDITING_CHAPTERS -&gt; READY_FOR_REVIEW</p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 shadow-sm p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Study Projects</p>
                <h2 className="text-2xl font-black text-slate-900 mt-2">Workspace Aktif</h2>
              </div>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm min-w-[240px]">
                <option value="">Pilih project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>

            {selectedProject ? (
              <>
                {selectedProject.status && !["DRAFT", "READY_FOR_REVIEW", "FAILED", "COMPLETED"].includes(selectedProject.status) ? (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 flex items-start gap-4 animate-pulse">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-900 uppercase tracking-wide">Pipeline Aktif: {selectedProject.status}</p>
                      <p className="text-sm text-emerald-800 mt-1 font-medium">
                        Sedang mengerjakan: <span className="font-mono bg-emerald-200/50 px-1.5 py-0.5 rounded text-emerald-900">{selectedProject.orchestration?.phase || "Inisialisasi..."}</span>
                      </p>
                      {selectedProject.orchestration?.completedPhases && selectedProject.orchestration.completedPhases.length > 0 && (
                        <p className="text-[11px] text-emerald-600 mt-2 font-bold uppercase tracking-wider">
                          Selesai: {selectedProject.orchestration.completedPhases.length} tahap
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Status</p>
                    <p className="text-lg font-black text-slate-900 mt-2">{selectedProject.status}</p>
                    <p className="text-xs text-slate-500 mt-1">Phase: {selectedProject.orchestration?.phase || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Sources</p>
                    <p className="text-lg font-black text-slate-900 mt-2">{selectedProject.sourceStats?.total || 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Indexed: {selectedProject.sourceStats?.indexed || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Outline</p>
                    <p className="text-lg font-black text-slate-900 mt-2">{selectedProject.outline?.chapters?.length || 0} bab</p>
                    <p className="text-xs text-slate-500 mt-1">Review: {selectedProject.reviewStatus || 'DRAFTING'}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-6 text-sm text-stone-600">Belum ada project dipilih.</div>
            )}
          </div>

          {isCurrentProjectManager ? (
            <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 shadow-sm p-6 space-y-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">Knowledge Base</p>
                <h2 className="text-2xl font-black text-slate-900 mt-2">Upload Sumber Kajian</h2>
              </div>

              <textarea value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} placeholder="Opsional: catatan ringkas kenapa sumber ini relevan" className="w-full min-h-[96px] rounded-xl border border-slate-200 px-3 py-3 text-sm" />
              <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-stone-50 px-4 py-8 text-sm font-bold text-stone-700 cursor-pointer hover:border-amber-500 hover:text-amber-700 transition-colors">
                {uploadingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Upload PDF/DOCX/TXT/CSV/XLSX pendukung
                <input type="file" multiple className="hidden" onChange={handleUploadSource} disabled={!selectedProjectId || uploadingSource} />
              </label>

              <div className="flex flex-col gap-2 mt-4">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Atau Import dari Google Drive</p>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={driveUrl} 
                    onChange={(e) => setDriveUrl(e.target.value)} 
                    placeholder="https://docs.google.com/document/d/..." 
                    className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm" 
                  />
                  <button 
                    type="button" 
                    onClick={handleGoogleDriveImport} 
                    disabled={!driveUrl.trim() || importingDrive || !selectedProjectId} 
                    className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                  >
                    {importingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />} Import
                  </button>
                </div>
              </div>

              <button type="button" onClick={handleStartPipeline} disabled={!selectedProjectId || startingPipeline} className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {startingPipeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Jalankan Ingestion + Writer + Auditor
              </button>
              
              {sources.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Daftar Sumber Kajian ({sources.length})</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {sources.map((src) => (
                      <div key={src.id} className="flex flex-col bg-stone-50 rounded-xl border border-stone-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {src.kind === 'url' ? <Globe className="w-4 h-4 text-sky-600 shrink-0" /> : src.kind === 'file' ? <FileUp className="w-4 h-4 text-rose-600 shrink-0" /> : <Database className="w-4 h-4 text-amber-500 shrink-0" />}
                            <p className="text-xs font-bold text-slate-800 break-all line-clamp-2">
                              {src.title}
                            </p>
                          </div>
                          {src.isSupplemental && (
                            <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Revisi Tambahan
                            </span>
                          )}
                        </div>
                        {src.summaryHint && (
                          <div className="mt-2 p-2 bg-white border border-stone-100 rounded-lg max-h-[80px] overflow-y-auto text-[10px] text-stone-600 font-mono line-clamp-3">
                            {src.summaryHint}
                          </div>
                        )}
                        <p className="text-[10px] text-stone-400 mt-2">
                          {src.createdAt ? new Date(src.createdAt.toMillis ? src.createdAt.toMillis() : src.createdAt).toLocaleString() : 'Baru ditambahkan'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {selectedProject?.outline?.chapters?.length ? (
            <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 shadow-sm p-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Generated Outline</p>
                <div className="flex items-center justify-between mt-2">
                  <h2 className="text-2xl font-black text-slate-900">Rencana Bab</h2>
                  <div className="flex items-center gap-2">
                    {selectedProject.status === "REVIEWING_OUTLINE" && isCurrentProjectManager && (
                      <button 
                        onClick={handleApproveOutline}
                        disabled={approvingOutline}
                        className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60"
                      >
                        {approvingOutline ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Setujui Outline & Lanjut Penulisan
                      </button>
                    )}
                    <Link href={`/study/${selectedProjectId}`} className="h-9 px-4 rounded-lg bg-stone-900 hover:bg-amber-700 text-white font-bold text-sm flex items-center gap-2 transition-colors">
                      <FileText className="w-4 h-4" /> Buka Document Viewer
                    </Link>
                  </div>
                </div>
              </div>

              {(selectedProject.status === "READY_FOR_REVIEW" || selectedProject.status === "COMPLETED") && isCurrentProjectManager && (
                <div className="mt-5 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 space-y-3">
                  <p className="font-black uppercase tracking-[0.18em] text-[11px] text-amber-900">Publish ke Crypto Academy</p>
                  <p className="text-sm text-amber-900">Kajian ini sudah selesai dan siap dijadikan materi Crypto Academy.</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">Pilih Level</span>
                      <select value={academyLevel} onChange={(e) => setAcademyLevel(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm">
                        <option value="Level 1: Pemula">Level 1: Pemula (Crypto 101)</option>
                        <option value="Level 2: Menengah">Level 2: Menengah (Teknikal Trader)</option>
                        <option value="Level 3: Lanjutan">Level 3: Lanjutan (SMC/ICT)</option>
                        <option value="Level 4: Profesional">Level 4: Profesional (Kuantitatif)</option>
                      </select>
                    </label>
                    <label className="flex-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">Template Kuis (Opsional)</span>
                      <input type="text" placeholder="ID Template Assessment" value={academyAssessmentId} onChange={(e) => setAcademyAssessmentId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm" />
                    </label>
                    <button 
                      onClick={handlePublishToAcademy}
                      disabled={publishingToAcademy}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      {publishingToAcademy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Publish Module
                    </button>
                  </div>
                </div>
              )}

              {selectedProject.reviewSummary ? (
                <div className="mt-5 rounded-2xl bg-violet-50 ring-1 ring-violet-200 p-4 text-sm text-violet-950 space-y-2">
                  <p className="font-black uppercase tracking-[0.18em] text-[11px]">Review Summary</p>
                  <p>{selectedProject.reviewSummary.summary || 'Belum ada ringkasan review.'}</p>
                  {(selectedProject.reviewSummary.reviewerFocus || []).length > 0 ? (
                    <div>
                      <p className="font-bold mt-2">Fokus Reviewer</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {(selectedProject.reviewSummary.reviewerFocus || []).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProject.outline.chapters.map((chapter, index) => (
                  <div key={chapter.chapterId} className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Bab {index + 1}</p>
                    <p className="text-base font-black text-slate-900 mt-2 flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 text-violet-700" /> {chapter.title}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}