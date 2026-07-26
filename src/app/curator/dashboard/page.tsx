'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  LogOut,
  ShieldCheck,
  Search,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Eye,
  Tag,
  X,
  Plus,
  Loader2,
  Edit3,
} from 'lucide-react';
import { CuratorAssessmentDetail } from '@/app/components/curator/CuratorAssessmentDetail';
import { useMobileBack } from '@/hooks/useMobileBack';
import { logCuratorAuditEvent } from '@/lib/b2b-curator-audit';

type AllowedRole = 'curator' | 'assessor' | 'admin_csrs' | 'admin_omnifit';
const ALL_ORGS = '__all__';

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
}

function normalizeTimestamp(raw: unknown): string {
  if (raw && typeof raw === 'object' && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof raw === 'string' || typeof raw === 'number') {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

  return new Date().toISOString();
}

export default function CuratorDashboard() {
  const router = useRouter();
  const { user, role, loading: authLoading, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [organizationScopes, setOrganizationScopes] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>(ALL_ORGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  const [masterTags, setMasterTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  useMobileBack(!!selectedAssessment, () => setSelectedAssessment(null));
  useMobileBack(isManageTagsOpen, () => setIsManageTagsOpen(false));

  const hasRoleAccess = (currentRole: string | null): currentRole is AllowedRole => (
    currentRole === 'curator' || currentRole === 'assessor' || currentRole === 'admin_csrs' || currentRole === 'admin_omnifit'
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !hasRoleAccess(role)) {
      router.replace('/curator');
      return;
    }

    let unsubscribeAssessments: (() => void) | null = null;

    const load = async () => {
      setLoading(true);
      try {
        const userByUid = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
        const userByEmail = user.email ? await getDoc(doc(db, 'users', user.email)).catch(() => null) : null;
        const profile = userByUid?.data() || userByEmail?.data() || {};

        const mergedScopes = Array.from(new Set([
          ...toStringArray(profile.allowedOrganizations),
          ...toStringArray(profile.organizationScopes),
          ...toStringArray(profile.accessibleOrganizations),
        ]));

        let finalScopes = mergedScopes;

        if (finalScopes.length === 0 && user.email) {
          const assessorDoc = await getDoc(doc(db, 'assessors', user.email)).catch(() => null);
          const assessorData = assessorDoc?.data() as { programName?: unknown } | undefined;
          const assessorProgram = typeof assessorData?.programName === 'string' ? assessorData.programName.trim() : '';
          if (assessorProgram) {
            finalScopes = [assessorProgram];
          }
        }

        if (finalScopes.length === 0) {
          setOrganizationScopes([]);
          setAssessments([]);
          setLoading(false);
          return;
        }

        setOrganizationScopes(finalScopes);
        const limitedScopes = finalScopes.length > 10 ? finalScopes.slice(0, 10) : finalScopes;

        const qAssessments = limitedScopes.length === 1
          ? query(collection(db, 'assessments'), where('corporateEntity', '==', limitedScopes[0]))
          : query(collection(db, 'assessments'), where('corporateEntity', 'in', limitedScopes));

        unsubscribeAssessments = onSnapshot(qAssessments, (snapshot) => {
          const next = snapshot.docs
            .map((entry) => {
              const data = entry.data() as Record<string, unknown>;
              return {
                id: entry.id,
                ...data,
                createdAt: normalizeTimestamp(data.createdAt),
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setAssessments(next);
          setLoading(false);
        });
      } catch (error) {
        console.error('Gagal menarik data untuk kurator:', error);
        setLoading(false);
      }
    };

    load();

    return () => {
      if (unsubscribeAssessments) {
        unsubscribeAssessments();
      }
    };
  }, [authLoading, role, router, user]);

  useEffect(() => {
    if (!organizationScopes.includes(selectedOrganization) && selectedOrganization !== ALL_ORGS) {
      setSelectedOrganization(ALL_ORGS);
    }
  }, [organizationScopes, selectedOrganization]);

  const visibleAssessments = useMemo(() => {
    const byOrg = selectedOrganization === ALL_ORGS
      ? assessments
      : assessments.filter((item) => (item.corporateEntity || '') === selectedOrganization);

    return byOrg.filter((item) => item.namaUsaha?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assessments, searchQuery, selectedOrganization]);

  const totalSubmissions = visibleAssessments.length;
  const validatedCount = visibleAssessments.filter((item) => item.status === 'Curator_Validated').length;
  const pendingCount = totalSubmissions - validatedCount;

  const activeTagOrganization = selectedOrganization === ALL_ORGS ? organizationScopes[0] : selectedOrganization;

  useEffect(() => {
    if (!activeTagOrganization) {
      setMasterTags([]);
      return;
    }

    setIsLoadingTags(true);
    const ref = doc(db, 'corporate_tags', activeTagOrganization);
    getDoc(ref)
      .then((snapshot) => {
        if (snapshot.exists() && Array.isArray(snapshot.data().tags)) {
          setMasterTags(snapshot.data().tags);
        } else {
          setMasterTags([]);
        }
      })
      .catch((error) => {
        console.error('Gagal menarik tag organization:', error);
        setMasterTags([]);
      })
      .finally(() => {
        setIsLoadingTags(false);
      });
  }, [activeTagOrganization]);

  const handleLogout = async () => {
    await logout();
    router.replace('/curator');
  };

  const triggerRefresh = () => {
    setSelectedAssessment(null);
  };

  const updateTagsInFirestore = async (newTagsList: string[]) => {
    if (!activeTagOrganization) {
      return;
    }

    try {
      const tagsDocRef = doc(db, 'corporate_tags', activeTagOrganization);
      await setDoc(tagsDocRef, {
        corporateEntity: activeTagOrganization,
        tags: newTagsList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (user) {
        const removedTags = masterTags.filter((item) => !newTagsList.includes(item));
        const addedTags = newTagsList.filter((item) => !masterTags.includes(item));
        const action = addedTags.length > 0 && removedTags.length === 0
          ? 'tag_add'
          : removedTags.length > 0 && addedTags.length === 0
            ? 'tag_remove'
            : 'tag_bulk_update';

        await logCuratorAuditEvent({
          action,
          userId: user.uid,
          userEmail: user.email || '',
          role: role || 'unknown',
          corporateEntity: activeTagOrganization,
          details: {
            addedTags,
            removedTags,
            previousCount: masterTags.length,
            nextCount: newTagsList.length,
          },
          routePath: '/curator/dashboard',
        }).catch((error) => {
          console.warn('Gagal menyimpan audit log tag curator:', error);
        });
      }

      setMasterTags(newTagsList);
    } catch (error) {
      console.error('Gagal menyimpan tags ke database:', error);
      alert('Gagal menyimpan tag. Periksa koneksi Anda.');
    }
  };

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim().toUpperCase();
    if (trimmed && !masterTags.includes(trimmed)) {
      updateTagsInFirestore([...masterTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = masterTags.filter((item) => item !== tagToRemove);
    updateTagsInFirestore(updatedTags);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600" />
        <p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Workspace Kurator...</p>
      </div>
    );
  }

  if (!user || !hasRoleAccess(role)) {
    return null;
  }

  if (organizationScopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 opacity-30 text-slate-400" />
        <h2 className="text-xl font-black text-slate-700">Scope Organisasi Belum Aktif</h2>
        <p className="font-medium text-sm max-w-lg">
          Akun Anda belum memiliki scope organisasi B2B untuk modul curator. Minta admin menambahkan allowedOrganizations di panel B2B Access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-black text-slate-900 leading-tight">Portal Kurator</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  {selectedOrganization === ALL_ORGS ? 'Multi-Organisasi' : selectedOrganization}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold gap-2">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pendaftar</p>
              <h3 className="text-3xl font-black text-slate-900">{totalSubmissions}</h3>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Menunggu Finalisasi</p>
              <h3 className="text-3xl font-black text-slate-900">{pendingCount}</h3>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Selesai Validasi</p>
              <h3 className="text-3xl font-black text-slate-900">{validatedCount}</h3>
            </div>
          </Card>
        </div>

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Daftar Tugas Kurasi Lapangan
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {organizationScopes.length > 1 && (
                <select
                  value={selectedOrganization}
                  onChange={(event) => setSelectedOrganization(event.target.value)}
                  className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-semibold text-slate-700"
                >
                  <option value={ALL_ORGS}>Semua Organisasi</option>
                  {organizationScopes.map((org) => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              )}

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari nama usaha..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <Button
                onClick={() => setIsManageTagsOpen(true)}
                variant="outline"
                className="gap-2 font-bold bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl h-10 shadow-sm w-full sm:w-auto"
                disabled={!activeTagOrganization}
              >
                <Tag className="w-4 h-4" /> Kelola Tags
              </Button>
            </div>
          </div>

          {visibleAssessments.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">
              Belum ada data pendaftar baru.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Nama Usaha / Startup</th>
                    <th className="px-6 py-5">Organisasi</th>
                    <th className="px-6 py-5 text-center">Skor Akhir</th>
                    <th className="px-6 py-5">Status Kurasi</th>
                    <th className="px-6 py-5 text-center">Tanggal Masuk</th>
                    <th className="px-6 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleAssessments.map((item) => {
                    const isFinalized = item.status === 'Curator_Validated';
                    const isDraft = item.status === 'Curator_Draft' || (!isFinalized && item.curatorAssessment !== undefined);
                    const skorAwal = item.originalAiResult ? item.originalAiResult.totalScore : item.aiResult?.totalScore || item.score || 0;
                    const skorAkhir = item.aiResult?.totalScore || item.score || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900 text-base mb-0.5">{item.namaUsaha}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3" /> {item.formData?.kota || 'Lokasi tidak diketahui'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-slate-600 font-semibold">{item.corporateEntity || '-'}</td>
                        <td className="px-6 py-5 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-base ring-1 ${isFinalized ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}>
                            {skorAkhir}
                          </div>
                          {(isFinalized || isDraft) && skorAkhir !== skorAwal && (
                            <div className="text-[10px] font-bold text-slate-400 mt-1">Skor AI Awal: {skorAwal}</div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {isFinalized ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </span>
                          ) : isDraft ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                              <Edit3 className="w-3.5 h-3.5" /> Draf
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Cek
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <Button
                            variant="default"
                            onClick={() => router.push(`/curator/assessment/${item.id}`)}
                            className={`rounded-xl font-bold h-9 px-4 shadow-sm transition-all ${isFinalized ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100' : isDraft ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                          >
                            {isFinalized ? (
                              <><Eye className="w-4 h-4 mr-1.5" /> Lihat Hasil</>
                            ) : isDraft ? (
                              <><Edit3 className="w-4 h-4 mr-1.5" /> Lanjut Draf</>
                            ) : (
                              <><MapPin className="w-4 h-4 mr-1.5" /> Mulai Validasi</>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isManageTagsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <Tag className="text-indigo-600" /> Kelola Master Tags
              </h3>
              <button onClick={() => setIsManageTagsOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-100 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
              Tag yang dikelola di sini terhubung dengan entitas <strong>{activeTagOrganization || '-'}</strong>.
            </p>

            <div className="flex gap-2 mb-6">
              <Input
                value={newTagInput}
                onChange={(event) => setNewTagInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAddNewTag()}
                placeholder="Buat tag baru..."
                className="h-11 bg-slate-50 rounded-xl"
              />
              <Button onClick={handleAddNewTag} className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus size={16} />
              </Button>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl ring-1 ring-slate-100 min-h-[100px]">
              {isLoadingTags ? (
                <div className="flex justify-center py-4 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {masterTags.length === 0 ? (
                    <span className="text-sm italic text-slate-400">Belum ada tag di database.</span>
                  ) : masterTags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 bg-white ring-1 ring-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-rose-50 transition-colors">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full mt-6 h-12 rounded-xl font-bold bg-slate-900 text-white" onClick={() => setIsManageTagsOpen(false)}>
              Selesai & Tutup
            </Button>
          </div>
        </div>
      )}

      {selectedAssessment && (
        <CuratorAssessmentDetail
          data={selectedAssessment}
          availableTags={masterTags}
          onClose={() => setSelectedAssessment(null)}
          onSaveSuccess={triggerRefresh}
        />
      )}
    </div>
  );
}
