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
import { AlertTriangle, CheckCircle2, Clock3, Plus, ShieldCheck, Target, Users2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  buildB2BDashboardSnapshot,
  DashboardAssessmentRecord,
  getOrganizationName,
  getOrganizationOptions,
  normalizeFirestoreDate,
  SegmentDimension,
} from '@/lib/b2b-dashboard';

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

    const normalizeScopeArray = (value: unknown): string[] => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
    };

    const init = async () => {
      try {
        const userDocByUid = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
        const userDocByEmail = user.email ? await getDoc(doc(db, 'users', user.email)).catch(() => null) : null;
        const profile = userDocByUid?.data() || userDocByEmail?.data() || {};
        const scopedPersonas = toStringArray(profile.b2bPersonas)
          .filter((entry): entry is PersonaView => entry === 'executive' || entry === 'hr' || entry === 'leader');
        const effectivePersonas: PersonaView[] = scopedPersonas.length > 0 ? scopedPersonas : ['leader'];
        setAllowedPersonas(effectivePersonas);

        if (!effectivePersonas.includes(persona)) {
          setError(`Akun Anda tidak memiliki akses persona ${persona}. Minta admin untuk menambahkan persona ini.`);
          setLoading(false);
          return;
        }

        const scopedOrganizations = [
          ...normalizeScopeArray(profile.allowedOrganizations),
          ...normalizeScopeArray(profile.organizationScopes),
          ...normalizeScopeArray(profile.accessibleOrganizations),
        ];

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

        if (scopedOrganizations.length === 0) {
          setError('Akun Anda belum memiliki organization scope. Hubungi admin untuk menambahkan allowedOrganizations.');
          setLoading(false);
          return;
        }

        if (scopedOrganizations.length === 1) {
          const scopedQuery = query(collection(db, 'assessments'), where('corporateEntity', '==', scopedOrganizations[0]));
          unsubscribeAssessments = onSnapshot(scopedQuery, (snapshot) => {
            const next = snapshot.docs
              .map((item) => parseRecord(item.id, item.data() as Record<string, unknown>))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRecords(next);
            setLoading(false);
          });
          return;
        }

        const chunks: string[][] = [];
        for (let index = 0; index < scopedOrganizations.length; index += 10) {
          chunks.push(scopedOrganizations.slice(index, index + 10));
        }

        const cacheByChunk = new Map<number, DashboardAssessmentRecord[]>();
        const unsubs = chunks.map((orgChunk, chunkIndex) => {
          const scopedQuery = query(collection(db, 'assessments'), where('corporateEntity', 'in', orgChunk));
          return onSnapshot(scopedQuery, (snapshot) => {
            const parsed = snapshot.docs.map((item) => parseRecord(item.id, item.data() as Record<string, unknown>));
            cacheByChunk.set(chunkIndex, parsed);

            const merged = Array.from(cacheByChunk.values())
              .flat()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setRecords(merged);
            setLoading(false);
          }, (watchError) => {
            console.error('Gagal memuat scope multi-tenant B2B:', watchError);
            setError('Terjadi kendala saat memuat sebagian scope organization B2B.');
            setLoading(false);
          });
        });

        unsubscribeAssessments = () => {
          unsubs.forEach((unsub) => unsub());
        };
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
  }, [authLoading, role, user]);

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
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 text-white">
        <p className="text-[11px] uppercase tracking-[0.2em] text-blue-200 font-black">B2B Self-Service Dashboard</p>
        <h1 className="text-3xl font-black mt-2">Persona: {persona.toUpperCase()}</h1>
        <p className="text-sm text-blue-100 mt-2">Dashboard tenant ini terpisah dari admin internal dan hanya menampilkan data sesuai scope organisasi akun Anda.</p>
        <p className="text-xs text-blue-100/90 mt-2">Persona diizinkan: {allowedPersonas.length > 0 ? allowedPersonas.join(', ') : 'leader'}</p>

        <div className="mt-4 max-w-sm">
          <label className="block text-xs uppercase tracking-[0.2em] text-blue-100 font-black">Organization</label>
          <select
            value={selectedOrganization}
            onChange={(event) => setSelectedOrganization(event.target.value)}
            className="w-full mt-2 h-11 rounded-xl bg-white/10 border border-white/20 px-3 text-sm"
          >
            <option value={ALL_ORGANIZATIONS}>Semua organization pada scope</option>
            {organizationOptions.map((org) => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-900">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Participants</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{snapshot.totalParticipants}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Validated Coverage</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{formatPercent(snapshot.totalParticipants > 0 ? (snapshot.validatedCount / snapshot.totalParticipants) * 100 : 0)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Low Readiness Signals</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{snapshot.segmentSummaries.filter((item) => item.priority === 'High').length}</p>
        </div>
        {showScore && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Average Score</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{formatScore(snapshot.avgScore)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Top Tactical Recommendations</h2>
          <div className="mt-4 space-y-3">
            {snapshot.tacticalRecommendations.slice(0, 4).map((recommendation) => (
              <div key={recommendation.segment} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-900">{recommendation.segment}</p>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full ring-1 ring-indigo-200">{recommendation.priority}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{recommendation.rationale}</p>
              </div>
            ))}
            {snapshot.tacticalRecommendations.length === 0 && (
              <div className="text-sm text-slate-500">Belum ada rekomendasi taktis.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Pilot Health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3"><Users2 className="w-4 h-4 text-slate-500" /> Tenants in scope: {organizationOptions.length}</div>
            <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-slate-500" /> Analytics coverage: {formatPercent(snapshot.totalParticipants > 0 ? (snapshot.analyticsCoverageCount / snapshot.totalParticipants) * 100 : 0)}</div>
            <div className="flex items-center gap-3"><Target className="w-4 h-4 text-slate-500" /> B2B2C ready count: {snapshot.b2b2cReadyCount}</div>
            <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-slate-500" /> Risk hotspots: {snapshot.riskHotspots.length}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Action Tracker (Closure Evidence)</h2>
          <div className="text-xs text-slate-500">owner, due date, status, closure evidence</div>
        </div>

        {showActionBuilder && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <input
              value={newActionTitle}
              onChange={(event) => setNewActionTitle(event.target.value)}
              placeholder="Judul action"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            />
            <input
              value={newActionSegment}
              onChange={(event) => setNewActionSegment(event.target.value)}
              placeholder="Segment"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            />
            <input
              type="date"
              value={newActionDueDate}
              onChange={(event) => setNewActionDueDate(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateAction}
              className="h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Action
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {actions.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-black text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.segment} | Owner: {item.ownerName} | Due: {item.dueDate || '-'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleUpdateActionStatus(item, 'open')} className={`text-xs px-2 py-1 rounded-lg ring-1 ${item.status === 'open' ? 'bg-rose-50 ring-rose-200 text-rose-700' : 'bg-white ring-slate-200 text-slate-500'}`}>Open</button>
                  <button type="button" onClick={() => handleUpdateActionStatus(item, 'in_progress')} className={`text-xs px-2 py-1 rounded-lg ring-1 ${item.status === 'in_progress' ? 'bg-amber-50 ring-amber-200 text-amber-700' : 'bg-white ring-slate-200 text-slate-500'}`}>In Progress</button>
                  <button type="button" onClick={() => handleUpdateActionStatus(item, 'closed')} className={`text-xs px-2 py-1 rounded-lg ring-1 ${item.status === 'closed' ? 'bg-emerald-50 ring-emerald-200 text-emerald-700' : 'bg-white ring-slate-200 text-slate-500'}`}>Closed</button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">Closure Evidence</p>
                <textarea
                  value={closureEvidenceDrafts[item.id] || ''}
                  onChange={(event) => setClosureEvidenceDrafts((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))}
                  disabled={!canEditActionEvidence || savingEvidenceById[item.id]}
                  placeholder="Tuliskan bukti penutupan aksi, hasil implementasi, atau tautan evidence..."
                  className="w-full min-h-[84px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                />
                {canEditActionEvidence && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveClosureEvidence(item)}
                      disabled={savingEvidenceById[item.id]}
                      className="h-8 px-3 rounded-lg text-xs font-black uppercase tracking-[0.12em] bg-slate-900 text-white disabled:opacity-60"
                    >
                      {savingEvidenceById[item.id] ? 'Saving...' : 'Save Evidence'}
                    </button>
                  </div>
                )}
              </div>
              {item.status === 'closed' ? (
                <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Closed</p>
              ) : (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Pending closure evidence</p>
              )}
            </div>
          ))}
          {actions.length === 0 && <div className="text-sm text-slate-500">Belum ada action tracker untuk organization ini.</div>}
        </div>
      </div>
    </div>
  );
}
