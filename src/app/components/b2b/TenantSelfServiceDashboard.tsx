'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Clock3, Plus, ShieldCheck, Target, Users2, Search, BarChart3, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantScope } from '@/hooks/useTenantScope';
import { db } from '@/lib/firebase';
import {
  buildB2BDashboardSnapshot,
  DashboardAssessmentRecord,
  getOrganizationName,
  getOrganizationOptions,
  normalizeFirestoreDate,
  SegmentDimension,
} from '@/lib/b2b-dashboard';
import { B2BInteractionModule } from './B2BInteractionModule';
import { B2BBrandingEditor } from './B2BBrandingEditor';
import { B2BParticipantProfile } from './B2BParticipantProfile';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from 'recharts';

type PersonaView = 'executive' | 'hr' | 'leader';
type ActionStatus = 'open' | 'in_progress' | 'closed';

interface ActionItem {
  id: string;
  corporateEntity: string;
  title: string;
  segment: string;
  ownerName: string;
  ownerUid: string;
  dueDate: string;
  status: ActionStatus;
  closureEvidence?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ALL_ORGANIZATIONS = '__all__';

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(1);
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
}

function parseRecord(id: string, data: Record<string, unknown>): DashboardAssessmentRecord {
  return {
    id,
    createdAt: normalizeFirestoreDate(data.createdAt),
    corporateEntity: typeof data.corporateEntity === 'string' ? data.corporateEntity : undefined,
    b2bOrganizationId: typeof data.b2bOrganizationId === 'string' ? data.b2bOrganizationId : undefined,
    trackType: typeof data.trackType === 'string' ? data.trackType : undefined,
    namaUsaha: typeof data.namaUsaha === 'string' ? data.namaUsaha : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    score: typeof data.score === 'number' ? data.score : undefined,
    readinessLevel: typeof data.readinessLevel === 'string' ? data.readinessLevel : undefined,
    formData: (typeof data.formData === 'object' && data.formData && !Array.isArray(data.formData))
      ? (data.formData as Record<string, unknown>)
      : undefined,
    analyticsSummary: (typeof data.analyticsSummary === 'object' && data.analyticsSummary && !Array.isArray(data.analyticsSummary))
      ? (data.analyticsSummary as DashboardAssessmentRecord['analyticsSummary'])
      : undefined,
    curatorAssessment: (typeof data.curatorAssessment === 'object' && data.curatorAssessment && !Array.isArray(data.curatorAssessment))
      ? (data.curatorAssessment as DashboardAssessmentRecord['curatorAssessment'])
      : undefined,
    aiResult: (typeof data.aiResult === 'object' && data.aiResult && !Array.isArray(data.aiResult))
      ? (data.aiResult as any)
      : undefined,
  } satisfies DashboardAssessmentRecord;
}

export function TenantSelfServiceDashboard({ persona }: { persona: PersonaView }) {
  const { user, role, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<DashboardAssessmentRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>(ALL_ORGANIZATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [newActionSegment, setNewActionSegment] = useState('');
  const [closureEvidenceDrafts, setClosureEvidenceDrafts] = useState<Record<string, string>>({});
  const [savingEvidenceById, setSavingEvidenceById] = useState<Record<string, boolean>>({});
  const [allowedPersonas, setAllowedPersonas] = useState<PersonaView[]>([]);
  const auditLogKeyRef = useRef<string>('');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'intake' | 'actions' | 'branding'>('overview');
  const [selectedParticipant, setSelectedParticipant] = useState<DashboardAssessmentRecord | null>(null);

  const { b2bPersonas } = useAuth();
  const { accessibleOrgs, isSuperAdmin, getTenantScopeConstraints } = useTenantScope();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setError('Anda harus login untuk mengakses dashboard B2B.');
      setLoading(false);
      return;
    }

    let unsubscribeAssessments: (() => void) | null = null;
    setLoading(true);
    setError(null);

    const init = async () => {
      try {
        const scopedPersonas = (b2bPersonas || [])
          .map(entry => entry.toLowerCase())
          .filter((entry): entry is PersonaView => entry === 'executive' || entry === 'hr' || entry === 'leader');
        
        const effectivePersonas: PersonaView[] = scopedPersonas.length > 0 ? scopedPersonas : ['leader'];
        setAllowedPersonas(effectivePersonas);

        if (!effectivePersonas.includes(persona)) {
          setError(`Akun Anda tidak memiliki akses persona ${persona}. Minta admin untuk menambahkan persona ini.`);
          setLoading(false);
          return;
        }

        if (role === 'assessor') {
          const assessorSnap = user.email ? await getDoc(doc(db, 'assessors', user.email)).catch(() => null) : null;
          const assessorProgram = typeof assessorSnap?.data()?.programName === 'string'
            ? assessorSnap.data()?.programName?.trim()
            : '';

          if (!assessorProgram) {
            setError('Akun assessor belum terhubung ke programName. Hubungi admin untuk aktivasi scope.');
            setLoading(false);
            return;
          }

          const scopedQuery = query(collection(db, 'assessments'), where('corporateEntity', '==', assessorProgram));
          unsubscribeAssessments = onSnapshot(scopedQuery, (snapshot) => {
            const next = snapshot.docs
              .map((item) => parseRecord(item.id, item.data() as Record<string, unknown>))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRecords(next);
            setLoading(false);
          });
          return;
        }

        if (!isSuperAdmin && accessibleOrgs.length === 0) {
          setError('Akun Anda belum memiliki organization scope. Hubungi admin untuk menambahkan allowedOrganizations.');
          setLoading(false);
          return;
        }

        // Gunakan useTenantScope
        const constraints = getTenantScopeConstraints('corporateEntity');
        
        // Firestore 'in' hanya mendukung maksimal 30 item, useTenantScope membatasi maksimal 30.
        // Jika butuh lebih dari 30 (sangat jarang terjadi), logic lama `chunks` diperlukan. Tapi dengan design sekarang 30 sudah sangat cukup untuk 1 user
        const scopedQuery = query(collection(db, 'assessments'), ...constraints);
        
        unsubscribeAssessments = onSnapshot(scopedQuery, (snapshot) => {
          const next = snapshot.docs
            .map((item) => parseRecord(item.id, item.data() as Record<string, unknown>))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRecords(next);
          setLoading(false);
        }, (watchError) => {
          console.error('Gagal memuat scope multi-tenant B2B:', watchError);
          setError('Terjadi kendala saat memuat scope organization B2B.');
          setLoading(false);
        });

      } catch (err) {
        console.error('Gagal memuat tenant self-service dashboard:', err);
        setError('Terjadi kesalahan saat memuat dashboard B2B tenant.');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribeAssessments) {
        unsubscribeAssessments();
      }
    };
  }, [authLoading, role, user?.uid, b2bPersonas, accessibleOrgs, isSuperAdmin]);

  const organizationOptions = useMemo(() => getOrganizationOptions(records), [records]);

  useEffect(() => {
    if (selectedOrganization !== ALL_ORGANIZATIONS && !organizationOptions.includes(selectedOrganization)) {
      setSelectedOrganization(organizationOptions[0] || ALL_ORGANIZATIONS);
    }
  }, [organizationOptions, selectedOrganization]);

  const filteredRecords = useMemo(() => {
    if (selectedOrganization === ALL_ORGANIZATIONS) {
      return records;
    }

    return records.filter((record) => getOrganizationName(record) === selectedOrganization);
  }, [records, selectedOrganization]);

  const snapshot = useMemo(
    () => buildB2BDashboardSnapshot(filteredRecords, 'division' as SegmentDimension),
    [filteredRecords],
  );

  useEffect(() => {
    if (!user || loading || filteredRecords.length === 0) {
      return;
    }

    const organization = selectedOrganization === ALL_ORGANIZATIONS ? 'multi-tenant' : selectedOrganization;
    const key = `${user.uid}:${persona}:${organization}`;
    if (auditLogKeyRef.current === key) {
      return;
    }

    auditLogKeyRef.current = key;

    addDoc(collection(db, 'b2b_dashboard_access_logs'), {
      userId: user.uid,
      userEmail: user.email || '',
      role: role || 'unknown',
      persona,
      corporateEntity: organization,
      routePath: `/b2b/${persona}`,
      accessedAt: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }).catch((err) => {
      console.warn('Gagal menyimpan audit log akses B2B dashboard:', err);
    });
  }, [filteredRecords.length, loading, persona, role, selectedOrganization, user]);

  useEffect(() => {
    if (selectedOrganization === ALL_ORGANIZATIONS) {
      setActions([]);
      return;
    }

    const q = query(collection(db, 'b2b_action_tracker'), where('corporateEntity', '==', selectedOrganization));
    const unsubscribe = onSnapshot(q, (snapshotData) => {
      const next = snapshotData.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          return {
            id: entry.id,
            corporateEntity: typeof data.corporateEntity === 'string' ? data.corporateEntity : selectedOrganization,
            title: typeof data.title === 'string' ? data.title : 'Tanpa judul',
            segment: typeof data.segment === 'string' ? data.segment : '-',
            ownerName: typeof data.ownerName === 'string' ? data.ownerName : '-',
            ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
            dueDate: typeof data.dueDate === 'string' ? data.dueDate : '',
            status: (typeof data.status === 'string' ? data.status : 'open') as ActionStatus,
            closureEvidence: typeof data.closureEvidence === 'string' ? data.closureEvidence : '',
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          } satisfies ActionItem;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      setActions(next);
      setClosureEvidenceDrafts((current) => {
        const merged = { ...current };
        next.forEach((item) => {
          if (merged[item.id] === undefined) {
            merged[item.id] = item.closureEvidence || '';
          }
        });
        return merged;
      });
    });

    return () => unsubscribe();
  }, [selectedOrganization]);

  const handleCreateAction = async () => {
    if (!user) {
      return;
    }

    if (selectedOrganization === ALL_ORGANIZATIONS) {
      setError('Pilih satu organization terlebih dahulu sebelum membuat action item.');
      return;
    }

    if (!newActionTitle.trim() || !newActionDueDate) {
      setError('Judul aksi dan due date wajib diisi.');
      return;
    }

    setError(null);
    await addDoc(collection(db, 'b2b_action_tracker'), {
      corporateEntity: selectedOrganization,
      title: newActionTitle.trim(),
      segment: newActionSegment.trim() || 'General',
      ownerUid: user.uid,
      ownerName: user.displayName || user.email || 'Unknown Owner',
      dueDate: newActionDueDate,
      status: 'open',
      closureEvidence: '',
      createdByUid: user.uid,
      createdByEmail: user.email || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewActionTitle('');
    setNewActionDueDate('');
    setNewActionSegment('');
  };

  const handleUpdateActionStatus = async (item: ActionItem, status: ActionStatus) => {
    await updateDoc(doc(db, 'b2b_action_tracker', item.id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveClosureEvidence = async (item: ActionItem) => {
    const draft = (closureEvidenceDrafts[item.id] || '').trim();

    setSavingEvidenceById((current) => ({ ...current, [item.id]: true }));
    try {
      await updateDoc(doc(db, 'b2b_action_tracker', item.id), {
        closureEvidence: draft,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSavingEvidenceById((current) => ({ ...current, [item.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        Memuat dashboard B2B tenant...
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-5 text-rose-900">
        <p className="font-black text-sm">Akses Dashboard Ditolak</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  const showScore = persona !== 'leader';
  const showActionBuilder = persona !== 'executive';
  const canEditActionEvidence = persona !== 'executive';

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-8 md:p-10 ring-1 ring-slate-200 shadow-sm">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-50 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest mb-4 ring-1 ring-indigo-200/50">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              B2B Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {persona.charAt(0).toUpperCase() + persona.slice(1)} Workspace
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-2 leading-relaxed">
              Pantau dan kelola seluruh pipeline, hasil asesmen, dan tindak lanjut dari program B2B Anda dalam satu dashboard terpusat.
            </p>
            {allowedPersonas.length > 0 && (
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">
                Access: {allowedPersonas.join(' • ')}
              </p>
            )}
          </div>
          
          <div className="w-full md:w-80 shrink-0">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">
              Select Tenant / Campaign
            </label>
            <div className="relative">
              <select
                value={selectedOrganization}
                onChange={(event) => setSelectedOrganization(event.target.value)}
                className="w-full h-12 rounded-xl bg-white border border-slate-200 px-4 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none appearance-none cursor-pointer transition-all"
              >
                <option value={ALL_ORGANIZATIONS}>All Organizations in Scope</option>
                {organizationOptions.map((org) => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 text-sm text-rose-900 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Perhatian</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white ring-1 ring-slate-200 rounded-2xl overflow-x-auto hide-scrollbar w-fit">
        <button
          onClick={() => { setActiveTab('overview'); setSelectedParticipant(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Overview & Analytics
        </button>
        <button
          onClick={() => setActiveTab('intake')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'intake' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users2 className="w-4 h-4" /> Pipeline / Intake
        </button>
        <button
          onClick={() => { setActiveTab('actions'); setSelectedParticipant(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'actions' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Target className="w-4 h-4" /> Action Tracker
        </button>
        {(persona === 'executive' || persona === 'hr') && (
          <button
            onClick={() => { setActiveTab('branding'); setSelectedParticipant(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'branding' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Branding & Landing Page
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Participants</p>
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Users2 className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900 mt-auto relative z-10">{snapshot.totalParticipants}</p>
            </div>
            
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Validated Coverage</p>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900 mt-auto relative z-10">{formatPercent(snapshot.totalParticipants > 0 ? (snapshot.validatedCount / snapshot.totalParticipants) * 100 : 0)}</p>
            </div>
            
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Risk Signals</p>
                <div className="p-2 bg-rose-50 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900 mt-auto relative z-10">{snapshot.segmentSummaries.filter((item) => item.priority === 'High').length}</p>
            </div>
            
            {showScore && (
              <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Avg Score</p>
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-black text-slate-900 mt-auto relative z-10">{formatScore(snapshot.avgScore)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            <div className="xl:col-span-2 rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Readiness Distribution
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={
                    Object.entries(
                      filteredRecords.reduce((acc, r) => {
                        const level = r.readinessLevel || 'Pending';
                        acc[level] = (acc[level] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([name, count]) => ({ name, count }))
                  }>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {Object.entries(
                        filteredRecords.reduce((acc, r) => {
                          const level = r.readinessLevel || 'Pending';
                          acc[level] = (acc[level] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-1 space-y-6">
              <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 mb-4">Tactical Recommendations</h2>
                <div className="space-y-4 text-sm">
                  {snapshot.tacticalRecommendations.slice(0, 3).map((recommendation) => (
                    <div key={recommendation.segment} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-slate-900">{recommendation.segment}</p>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full ring-1 ring-indigo-200">{recommendation.priority}</span>
                      </div>
                      <p className="text-slate-600 mt-2 leading-relaxed">{recommendation.rationale}</p>
                    </div>
                  ))}
                  {snapshot.tacticalRecommendations.length === 0 && (
                    <div className="text-slate-500 italic text-center py-4">No tactical recommendations available.</div>
                  )}
                </div>
              </div>
              
              <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 mb-4">Pilot Health</h2>
                <div className="space-y-3 text-sm font-medium">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="text-slate-600 flex items-center gap-2"><Users2 className="w-4 h-4" /> Tenants in scope</span> <span className="font-black text-slate-900">{organizationOptions.length}</span></div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="text-slate-600 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Analytics coverage</span> <span className="font-black text-slate-900">{formatPercent(snapshot.totalParticipants > 0 ? (snapshot.analyticsCoverageCount / snapshot.totalParticipants) * 100 : 0)}</span></div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="text-slate-600 flex items-center gap-2"><Target className="w-4 h-4" /> B2B2C ready</span> <span className="font-black text-slate-900">{snapshot.b2b2cReadyCount}</span></div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {activeTab === 'intake' && (
        selectedParticipant ? (
          <div className="h-[800px] animate-in slide-in-from-right-8 duration-300">
            <B2BParticipantProfile
              participant={selectedParticipant}
              corporateEntity={selectedOrganization !== ALL_ORGANIZATIONS ? selectedOrganization : (selectedParticipant.corporateEntity || '')}
              persona={persona}
              onBack={() => setSelectedParticipant(null)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Intake Pipeline</h2>
                <p className="text-sm text-slate-500 mt-1">Kelola dan pantau seluruh peserta asesmen dalam campaign Anda.</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 w-full md:w-80 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama usaha atau ID..."
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map(record => (
                <div 
                  key={record.id} 
                  onClick={() => setSelectedParticipant(record)}
                  className="group relative bg-white rounded-2xl p-5 ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-black shrink-0 ring-1 ring-indigo-200/50 group-hover:scale-105 transition-transform">
                        {(record.namaUsaha || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 line-clamp-1">{record.namaUsaha || 'Tanpa Nama'}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">{record.id.slice(0,8)}</p>
                      </div>
                    </div>
                    {record.score ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Score</span>
                        <span className="text-lg font-black text-indigo-600 leading-none">{record.score.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Score</span>
                        <span className="text-lg font-black text-slate-300 leading-none">-</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold ring-1 ring-slate-200">
                      {record.trackType || 'No Track'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ${
                      record.readinessLevel === 'Sangat Siap' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                      record.readinessLevel === 'Siap' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                      record.readinessLevel === 'Cukup Siap' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                      'bg-slate-50 text-slate-600 ring-slate-200'
                    }`}>
                      {record.readinessLevel || 'Pending'}
                    </span>
                  </div>
                  
                  {/* Overlay button on hover */}
                  <div className="absolute inset-0 bg-indigo-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                    <div className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      Review Profile
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredRecords.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Belum ada peserta</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">Pipeline untuk tenant ini masih kosong. Peserta yang menyelesaikan asesmen akan muncul di sini.</p>
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'actions' && (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Action Tracker</h2>
              <p className="text-sm text-slate-500 mt-1">Pantau tindak lanjut dan bukti implementasi (closure evidence).</p>
            </div>
            
            {showActionBuilder && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('new-action-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-10 px-5 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Action
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kanban Columns */}
            {(['open', 'in_progress', 'closed'] as const).map(status => {
              const columnActions = actions.filter(a => a.status === status);
              const isClosed = status === 'closed';
              
              return (
                <div key={status} className="flex flex-col bg-slate-50/50 rounded-2xl p-4 ring-1 ring-slate-200/60">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                      {status === 'open' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                      {status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      {status === 'closed' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      {status.replace('_', ' ')}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg ring-1 ring-slate-200">
                      {columnActions.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {columnActions.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-bold text-slate-900 leading-tight">{item.title}</p>
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mt-2 bg-indigo-50 w-fit px-2 py-0.5 rounded-md">
                            {item.segment}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 text-xs text-slate-500 mb-4 border-l-2 border-slate-100 pl-3">
                          <p><span className="font-medium text-slate-700">Owner:</span> {item.ownerName}</p>
                          <p><span className="font-medium text-slate-700">Due:</span> {item.dueDate || '-'}</p>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Closure Evidence
                          </p>
                          <textarea
                            value={closureEvidenceDrafts[item.id] || ''}
                            onChange={(event) => setClosureEvidenceDrafts((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))}
                            disabled={!canEditActionEvidence || savingEvidenceById[item.id]}
                            placeholder="Tuliskan bukti penutupan aksi atau tautan dokumen..."
                            className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100/50 disabled:text-slate-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          />
                          {canEditActionEvidence && (
                            <div className="mt-3 flex justify-between items-center">
                              {/* Status Shifters */}
                              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                {status !== 'open' && (
                                  <button onClick={() => handleUpdateActionStatus(item, 'open')} className="text-[10px] font-bold px-2 py-1 rounded text-slate-600 hover:bg-white hover:shadow-sm">Open</button>
                                )}
                                {status !== 'in_progress' && (
                                  <button onClick={() => handleUpdateActionStatus(item, 'in_progress')} className="text-[10px] font-bold px-2 py-1 rounded text-amber-700 hover:bg-white hover:shadow-sm">In Progress</button>
                                )}
                                {status !== 'closed' && (
                                  <button onClick={() => handleUpdateActionStatus(item, 'closed')} className="text-[10px] font-bold px-2 py-1 rounded text-emerald-700 hover:bg-white hover:shadow-sm">Close</button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSaveClosureEvidence(item)}
                                disabled={savingEvidenceById[item.id]}
                                className="h-7 px-3 rounded-md text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                              >
                                {savingEvidenceById[item.id] ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {isClosed && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Action Closed
                          </div>
                        )}
                      </div>
                    ))}
                    {columnActions.length === 0 && (
                      <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium">
                        Kosong
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showActionBuilder && (
            <div id="new-action-form" className="mt-12 bg-slate-50 rounded-2xl p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Create New Action
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Action Title</label>
                  <input
                    value={newActionTitle}
                    onChange={(event) => setNewActionTitle(event.target.value)}
                    placeholder="Contoh: Implementasi kebijakan HSE baru"
                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Segment / Kategori</label>
                  <input
                    value={newActionSegment}
                    onChange={(event) => setNewActionSegment(event.target.value)}
                    placeholder="HSE / Operations"
                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={newActionDueDate}
                    onChange={(event) => setNewActionDueDate(event.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateAction}
                  className="h-11 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  Create Action Item
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'branding' && (
        <B2BBrandingEditor 
          organizationId={
            selectedOrganization === ALL_ORGANIZATIONS 
              ? selectedOrganization 
              : records.find(r => getOrganizationName(r) === selectedOrganization)?.b2bOrganizationId || selectedOrganization
          } 
        />
      )}
    </div>
  );
}
