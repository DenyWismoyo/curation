'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CircleDashed,
  Filter,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users2,
  Download,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildB2BDashboardSnapshot,
  buildOrganizationSummaries,
  buildSummaryNarrative,
  DashboardAssessmentRecord,
  getEffectiveScore,
  getPrimarySegmentValue,
  getReadinessLabel,
  getOrganizationName,
  getOrganizationOptions,
  getStatusLabel,
  normalizeFirestoreDate,
  SEGMENT_OPTIONS,
  SegmentDimension,
} from '@/lib/b2b-dashboard';
import { B2BPilotExportPackButton } from '@/app/components/admin/b2b-pilot/B2BPilotExportPackButton';

const CHART_COLORS = ['#4f46e5', '#0f766e', '#d97706', '#db2777', '#0284c7', '#7c3aed', '#ea580c', '#475569'];
const ALL_ORGANIZATIONS = '__all__';
const UNKNOWN_SEGMENT_LABEL = 'Belum dipetakan';
const UNCLASSIFIED_READINESS_LABEL = 'Belum terklasifikasi';

type DashboardPackage = 'lite' | 'standard';
type DashboardPersona = 'executive' | 'hr' | 'leader' | 'partnerOps';
type AuthRole = 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | null;

interface CuratorAuditEntry {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  role: string;
  corporateEntity: string;
  assessmentId: string;
  createdAt: string;
  routePath: string;
  details: Record<string, unknown>;
}

const DASHBOARD_PACKAGES: Array<{ value: DashboardPackage; label: string; description: string }> = [
  {
    value: 'lite',
    label: 'Tier Lite',
    description: 'Executive + readiness + tactical board inti untuk pilot cepat.',
  },
  {
    value: 'standard',
    label: 'Tier Standard',
    description: 'Layer lengkap dengan segment diagnostics, portfolio, dan pilot ops.',
  },
];

const DASHBOARD_PERSONAS: Array<{ value: DashboardPersona; label: string; description: string }> = [
  { value: 'executive', label: 'Executive', description: 'Prioritas keputusan 30-60-90 hari.' },
  { value: 'hr', label: 'HR / People', description: 'Fokus coverage, gap kompetensi, dan validasi.' },
  { value: 'leader', label: 'People Leader', description: 'Melacak kualitas tim dan readiness hotspot.' },
  { value: 'partnerOps', label: 'Partner Ops', description: 'Menjaga SLA pilot dan kualitas data delivery.' },
];

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(1);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function toCsvCell(value: unknown): string {
  const text = String(value ?? '');
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  accentClass,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <Card className="p-5 bg-white rounded-[1.75rem] border-none ring-1 ring-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
          <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{hint}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accentClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="bg-white rounded-[2rem] border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default function AdminB2BPilotDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<DashboardAssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<string>(ALL_ORGANIZATIONS);
  const [selectedDimension, setSelectedDimension] = useState<SegmentDimension>('division');
  const [selectedPackage, setSelectedPackage] = useState<DashboardPackage>('standard');
  const [selectedPersona, setSelectedPersona] = useState<DashboardPersona>('executive');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [curatorAuditEntries, setCuratorAuditEntries] = useState<CuratorAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('');
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');

  const allowedPersonasByRole = useMemo(() => {
    const roleMap: Record<Exclude<AuthRole, null>, DashboardPersona[]> = {
      admin_csrs: ['executive', 'hr', 'leader', 'partnerOps'],
      admin_omnifit: ['executive', 'hr', 'leader', 'partnerOps'],
      assessor: ['leader', 'partnerOps'],
      curator: ['leader', 'partnerOps'],
      user: ['leader'],
    };

    if (!role) {
      return [];
    }

    return roleMap[role] || [];
  }, [role]);

  useEffect(() => {
    if (allowedPersonasByRole.length === 0) {
      return;
    }

    if (!allowedPersonasByRole.includes(selectedPersona)) {
      setSelectedPersona(allowedPersonasByRole[0]);
    }
  }, [allowedPersonasByRole, selectedPersona]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !role) {
      setRecords([]);
      setAccessError('Sesi tidak ditemukan. Silakan login ulang untuk memuat data dashboard B2B.');
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    setLoading(true);
    setAccessError(null);

    const normalizeScopeArray = (value: unknown): string[] => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
    };

    const parseSnapshot = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
      const nextRecords = snapshot.docs.map((document) => {
        const data = document.data() as Record<string, unknown>;
        return {
          id: document.id,
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
        }).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      setRecords(nextRecords);
      setLoading(false);
    };

    const init = async () => {
      try {
        const userDocByUid = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
        const userDocByEmail = user.email ? await getDoc(doc(db, 'users', user.email)).catch(() => null) : null;
        const profile = userDocByUid?.data() || userDocByEmail?.data() || {};

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
            setRecords([]);
            setAccessError('Role assessor belum terhubung ke programName. Hubungkan assessor terlebih dahulu di menu Manajemen Asesor.');
            setLoading(false);
            return;
          }

          const scopedQuery = query(
            collection(db, 'assessments'),
            where('corporateEntity', '==', assessorProgram),
          );

          unsubscribe = onSnapshot(
            scopedQuery,
            (snapshot) => parseSnapshot(snapshot as unknown as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }),
            (error) => {
              console.error('Gagal memuat dashboard B2B pilot (assessor scope):', error);
              setAccessError('Akses data scope assessor gagal diproses.');
              setLoading(false);
            },
          );
          return;
        }

        if (scopedOrganizations.length === 1) {
          const scopedQuery = query(
            collection(db, 'assessments'),
            where('corporateEntity', '==', scopedOrganizations[0]),
          );

          unsubscribe = onSnapshot(
            scopedQuery,
            (snapshot) => parseSnapshot(snapshot as unknown as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }),
            (error) => {
              console.error('Gagal memuat dashboard B2B pilot (single org scope):', error);
              setAccessError('Akses data organization scope gagal diproses.');
              setLoading(false);
            },
          );
          return;
        }

        if (scopedOrganizations.length > 1) {
          const chunks: string[][] = [];
          for (let index = 0; index < scopedOrganizations.length; index += 10) {
            chunks.push(scopedOrganizations.slice(index, index + 10));
          }

          const cacheByChunk = new Map<number, DashboardAssessmentRecord[]>();
          const unsubs = chunks.map((orgChunk, chunkIndex) => {
            const scopedQuery = query(
              collection(db, 'assessments'),
              where('corporateEntity', 'in', orgChunk),
            );

            return onSnapshot(
              scopedQuery,
              (snapshot) => {
                const parsed = snapshot.docs.map((document) => {
                  const data = document.data() as Record<string, unknown>;
                  return {
                    id: document.id,
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
                });

                cacheByChunk.set(chunkIndex, parsed);

                const merged = Array.from(cacheByChunk.values())
                  .flat()
                  .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

                setRecords(merged);
                setLoading(false);
              },
              (error) => {
                console.error('Gagal memuat dashboard B2B pilot (multi org scope):', error);
                setAccessError('Akses data multi-tenant scope gagal diproses.');
                setLoading(false);
              },
            );
          });

          unsubscribe = () => {
            unsubs.forEach((unsub) => unsub());
          };
          return;
        }

        const unrestrictedQuery = query(collection(db, 'assessments'), orderBy('createdAt', 'desc'));
        unsubscribe = onSnapshot(
          unrestrictedQuery,
          (snapshot) => parseSnapshot(snapshot as unknown as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }),
          (error) => {
            console.error('Gagal memuat dashboard B2B pilot:', error);
            setAccessError('Akses data dashboard gagal diproses.');
            setLoading(false);
          },
        );
      } catch (error) {
        console.error('Gagal inisialisasi role-based query dashboard B2B:', error);
        setAccessError('Inisialisasi akses berbasis role gagal.');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authLoading, role, user]);

  useEffect(() => {
    if (authLoading || !user || !role) {
      return;
    }

    const canViewCuratorAudit = role === 'admin_csrs' || role === 'admin_omnifit';
    if (!canViewCuratorAudit) {
      setCuratorAuditEntries([]);
      setAuditLoading(false);
      return;
    }

    setAuditLoading(true);
    const qAudit = query(
      collection(db, 'b2b_curator_audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(400),
    );

    const unsubscribeAudit = onSnapshot(
      qAudit,
      (snapshot) => {
        const entries = snapshot.docs.map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          return {
            id: entry.id,
            action: typeof data.action === 'string' ? data.action : 'unknown',
            userId: typeof data.userId === 'string' ? data.userId : '',
            userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
            role: typeof data.role === 'string' ? data.role : '',
            corporateEntity: typeof data.corporateEntity === 'string' ? data.corporateEntity : '',
            assessmentId: typeof data.assessmentId === 'string' ? data.assessmentId : '',
            createdAt: normalizeFirestoreDate(data.createdAt || data.clientTimestamp),
            routePath: typeof data.routePath === 'string' ? data.routePath : '',
            details: (typeof data.details === 'object' && data.details && !Array.isArray(data.details))
              ? (data.details as Record<string, unknown>)
              : {},
          } satisfies CuratorAuditEntry;
        });

        setCuratorAuditEntries(entries);
        setAuditLoading(false);
      },
      (error) => {
        console.error('Gagal memuat curator audit logs:', error);
        setCuratorAuditEntries([]);
        setAuditLoading(false);
      },
    );

    return () => unsubscribeAudit();
  }, [authLoading, role, user]);

  const organizationOptions = useMemo(() => getOrganizationOptions(records), [records]);

  const filteredRecords = useMemo(() => {
    if (selectedOrganization === ALL_ORGANIZATIONS) {
      return records;
    }

    return records.filter((record) => getOrganizationName(record) === selectedOrganization);
  }, [records, selectedOrganization]);

  const tenantScopedCuratorAudits = useMemo(() => {
    if (selectedOrganization === ALL_ORGANIZATIONS) {
      return curatorAuditEntries;
    }

    return curatorAuditEntries.filter((entry) => entry.corporateEntity === selectedOrganization);
  }, [curatorAuditEntries, selectedOrganization]);

  const filteredCuratorAudits = useMemo(() => {
    return tenantScopedCuratorAudits.filter((entry) => {
      if (auditActionFilter !== 'all' && entry.action !== auditActionFilter) {
        return false;
      }

      if (auditActorFilter.trim()) {
        const actorNeedle = auditActorFilter.trim().toLowerCase();
        const actorHaystack = `${entry.userEmail} ${entry.userId}`.toLowerCase();
        if (!actorHaystack.includes(actorNeedle)) {
          return false;
        }
      }

      const entryTime = new Date(entry.createdAt).getTime();
      if (!Number.isFinite(entryTime)) {
        return false;
      }

      if (auditDateFrom) {
        const fromTime = new Date(`${auditDateFrom}T00:00:00`).getTime();
        if (entryTime < fromTime) {
          return false;
        }
      }

      if (auditDateTo) {
        const toTime = new Date(`${auditDateTo}T23:59:59`).getTime();
        if (entryTime > toTime) {
          return false;
        }
      }

      return true;
    });
  }, [tenantScopedCuratorAudits, auditActionFilter, auditActorFilter, auditDateFrom, auditDateTo]);

  const actorFilterOptions = useMemo(
    () => Array.from(new Set(tenantScopedCuratorAudits.map((entry) => entry.userEmail || entry.userId).filter(Boolean))).slice(0, 100),
    [tenantScopedCuratorAudits],
  );

  const curatorAuditSummary = useMemo(() => {
    const actionCounts = filteredCuratorAudits.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {});

    const uniqueCurators = new Set(filteredCuratorAudits.map((entry) => entry.userEmail || entry.userId));
    const uniqueTenants = new Set(filteredCuratorAudits.map((entry) => entry.corporateEntity).filter(Boolean));

    return {
      totalEvents: filteredCuratorAudits.length,
      uniqueCurators: uniqueCurators.size,
      uniqueTenants: uniqueTenants.size,
      openDraftCount: actionCounts.open_draft || 0,
      finalizeCount: actionCounts.finalize_assessment || 0,
      tagEditCount: (actionCounts.tag_add || 0) + (actionCounts.tag_remove || 0) + (actionCounts.tag_bulk_update || 0),
    };
  }, [filteredCuratorAudits]);

  const curatorAuditAbuseSignals = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const isWithinLast24h = (createdAt: string): boolean => {
      const time = new Date(createdAt).getTime();
      return Number.isFinite(time) && time >= now - dayMs;
    };

    const finalizeLast24h = tenantScopedCuratorAudits.filter((entry) => entry.action === 'finalize_assessment' && isWithinLast24h(entry.createdAt));
    const tagChurnLast24h = tenantScopedCuratorAudits.filter((entry) => (entry.action === 'tag_add' || entry.action === 'tag_remove' || entry.action === 'tag_bulk_update') && isWithinLast24h(entry.createdAt));

    const finalizePrevious7dBuckets = new Map<string, number>();
    tenantScopedCuratorAudits.forEach((entry) => {
      if (entry.action !== 'finalize_assessment') {
        return;
      }

      const time = new Date(entry.createdAt).getTime();
      if (!Number.isFinite(time) || time >= now - dayMs || time < now - (8 * dayMs)) {
        return;
      }

      const bucket = new Date(time).toISOString().slice(0, 10);
      finalizePrevious7dBuckets.set(bucket, (finalizePrevious7dBuckets.get(bucket) || 0) + 1);
    });

    const finalizePrevious7dAvg = finalizePrevious7dBuckets.size > 0
      ? [...finalizePrevious7dBuckets.values()].reduce((sum, value) => sum + value, 0) / finalizePrevious7dBuckets.size
      : 0;

    const finalizeSpike = finalizeLast24h.length >= 8
      && finalizeLast24h.length >= Math.max(4, Math.ceil(finalizePrevious7dAvg * 2));

    const tagChurnAnomaly = tagChurnLast24h.length >= 10;

    const actorFinalizeCounts = finalizeLast24h.reduce<Record<string, number>>((acc, entry) => {
      const actor = entry.userEmail || entry.userId || 'unknown';
      acc[actor] = (acc[actor] || 0) + 1;
      return acc;
    }, {});

    let topActor = '';
    let topActorCount = 0;
    Object.entries(actorFinalizeCounts).forEach(([actor, count]) => {
      if (count > topActorCount) {
        topActor = actor;
        topActorCount = count;
      }
    });

    const actorDominance = finalizeLast24h.length >= 10 && topActorCount / finalizeLast24h.length >= 0.7;

    return {
      finalizeLast24h: finalizeLast24h.length,
      finalizePrevious7dAvg,
      tagChurnLast24h: tagChurnLast24h.length,
      finalizeSpike,
      tagChurnAnomaly,
      actorDominance,
      topActor,
      topActorCount,
    };
  }, [tenantScopedCuratorAudits]);

  const handleExportCuratorAuditCsv = () => {
    const rows = filteredCuratorAudits.map((entry) => [
      entry.createdAt,
      entry.corporateEntity,
      entry.action,
      entry.assessmentId,
      entry.userEmail || entry.userId,
      entry.role,
      entry.routePath,
      JSON.stringify(entry.details || {}),
    ]);

    const header = ['createdAt', 'corporateEntity', 'action', 'assessmentId', 'actor', 'role', 'routePath', 'details'];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const tenantLabel = selectedOrganization === ALL_ORGANIZATIONS ? 'all-tenants' : selectedOrganization.replace(/\s+/g, '-').toLowerCase();
    anchor.href = url;
    anchor.download = `curator-audit-${tenantLabel}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const portfolioSummaries = useMemo(() => buildOrganizationSummaries(records), [records]);
  const snapshot = useMemo(
    () => buildB2BDashboardSnapshot(filteredRecords, selectedDimension),
    [filteredRecords, selectedDimension],
  );

  const selectedSegmentMeta = SEGMENT_OPTIONS.find((option) => option.value === selectedDimension) || SEGMENT_OPTIONS[0];
  const selectedPackageMeta = DASHBOARD_PACKAGES.find((option) => option.value === selectedPackage) || DASHBOARD_PACKAGES[0];
  const selectedPersonaMeta = DASHBOARD_PERSONAS.find((option) => option.value === selectedPersona) || DASHBOARD_PERSONAS[0];
  const selectionTitle = selectedOrganization === ALL_ORGANIZATIONS ? 'Portfolio Omnifit' : selectedOrganization;
  const narrative = buildSummaryNarrative(snapshot);
  const isStandardPackage = selectedPackage === 'standard';
  const isLitePackage = selectedPackage === 'lite';

  const pilotOperations = useMemo(() => {
    const total = filteredRecords.length;
    const unknownSegmentCount = filteredRecords.filter(
      (record) => getPrimarySegmentValue(record, selectedDimension) === UNKNOWN_SEGMENT_LABEL,
    ).length;
    const unclassifiedReadinessCount = filteredRecords.filter(
      (record) => getReadinessLabel(record) === UNCLASSIFIED_READINESS_LABEL,
    ).length;
    const staleRecordsCount = filteredRecords.filter((record) => {
      const recordTime = new Date(record.createdAt).getTime();
      if (Number.isNaN(recordTime)) {
        return false;
      }

      const staleThresholdMs = 45 * 24 * 60 * 60 * 1000;
      return Date.now() - recordTime > staleThresholdMs;
    }).length;

    const validatedCoverage = total > 0 ? (snapshot.validatedCount / total) * 100 : 0;
    const analyticsCoverage = total > 0 ? (snapshot.analyticsCoverageCount / total) * 100 : 0;
    const dataCoverageScore = Math.round((validatedCoverage + analyticsCoverage) / 2);
    const backlogCount = total - snapshot.validatedCount;
    const highPrioritySegments = snapshot.segmentSummaries.filter((item) => item.priority === 'High').length;

    return {
      validatedCoverage,
      analyticsCoverage,
      dataCoverageScore,
      unknownSegmentCount,
      unclassifiedReadinessCount,
      staleRecordsCount,
      backlogCount,
      highPrioritySegments,
      staleRate: total > 0 ? (staleRecordsCount / total) * 100 : 0,
    };
  }, [filteredRecords, selectedDimension, snapshot]);

  const visibleRecommendations = useMemo(
    () => snapshot.tacticalRecommendations.slice(0, isLitePackage ? 3 : 5),
    [isLitePackage, snapshot.tacticalRecommendations],
  );

  const visibleSegmentRows = isLitePackage ? 4 : 8;

  const showSegmentDiagnostics = selectedPersona !== 'executive';
  const showTrendSignals = selectedPersona !== 'executive' || isStandardPackage;
  const showTenantPortfolio = isStandardPackage && (selectedPersona === 'executive' || selectedPersona === 'partnerOps');
  const showMetricContract = isStandardPackage;
  const showNextBuild = isStandardPackage;
  const canViewCuratorAudit = role === 'admin_csrs' || role === 'admin_omnifit';

  const successMetrics = useMemo(() => {
    const groupedByEntity = new Map<string, Array<{ createdAt: string; score: number | null; status: string }>>();

    filteredRecords.forEach((record) => {
      const key = record.namaUsaha?.trim() || record.id;
      const bucket = groupedByEntity.get(key) || [];
      bucket.push({
        createdAt: record.createdAt,
        score: getEffectiveScore(record),
        status: getStatusLabel(record),
      });
      groupedByEntity.set(key, bucket);
    });

    const entities = [...groupedByEntity.values()].map((items) => (
      [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    ));

    const retested = entities.filter((items) => items.length >= 2);
    const cadenceDays = retested
      .map((items) => {
        const prev = items[items.length - 2];
        const latest = items[items.length - 1];
        const diffMs = new Date(latest.createdAt).getTime() - new Date(prev.createdAt).getTime();
        if (!Number.isFinite(diffMs) || diffMs <= 0) {
          return null;
        }

        return diffMs / (24 * 60 * 60 * 1000);
      })
      .filter((value): value is number => value !== null);

    const improvements = retested
      .map((items) => {
        const firstScore = items[0].score;
        const latestScore = items[items.length - 1].score;
        if (firstScore === null || latestScore === null) {
          return null;
        }

        return latestScore - firstScore;
      })
      .filter((value): value is number => value !== null);

    const avgCadenceDays = cadenceDays.length > 0
      ? cadenceDays.reduce((sum, value) => sum + value, 0) / cadenceDays.length
      : null;

    const improvementDeltaAvg = improvements.length > 0
      ? improvements.reduce((sum, value) => sum + value, 0) / improvements.length
      : null;

    const highPrioritySegments = snapshot.segmentSummaries.filter((segment) => segment.priority === 'High');
    const closedSegments = highPrioritySegments.filter(
      (segment) => segment.validatedRate >= 80 && segment.lowReadinessRate < 20,
    );

    const closureRate = highPrioritySegments.length > 0
      ? (closedSegments.length / highPrioritySegments.length) * 100
      : 100;

    const uniqueEntitiesCount = entities.length;
    const retestedEntitiesCount = retested.length;
    const retestCoverageRate = uniqueEntitiesCount > 0 ? (retestedEntitiesCount / uniqueEntitiesCount) * 100 : 0;

    const milestone30Passed = pilotOperations.validatedCoverage >= 70 && pilotOperations.backlogCount <= Math.ceil(filteredRecords.length * 0.3);
    const milestone60Passed = retestCoverageRate >= 35 && (improvementDeltaAvg ?? 0) >= 5;
    const milestone90Passed = closureRate >= 60 && pilotOperations.dataCoverageScore >= 85;

    return {
      uniqueEntitiesCount,
      retestedEntitiesCount,
      retestCoverageRate,
      avgRetestCadenceDays: avgCadenceDays,
      improvementDeltaAvg,
      closureRate,
      milestone30: {
        passed: milestone30Passed,
        note: 'Coverage validasi >= 70% dan backlog <= 30% dari data aktif.',
      },
      milestone60: {
        passed: milestone60Passed,
        note: 'Retest coverage >= 35% dan delta peningkatan rata-rata >= 5 poin.',
      },
      milestone90: {
        passed: milestone90Passed,
        note: 'Closure rate >= 60% dan data coverage score >= 85.',
      },
    };
  }, [filteredRecords, pilotOperations, snapshot.segmentSummaries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.28em]">Menyiapkan dashboard B2B...</p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <Card className="rounded-[1.75rem] border-none ring-1 ring-rose-200 bg-rose-50 p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">Access Guard</p>
        <h2 className="text-xl font-black text-rose-900 mt-2">Akses data dashboard dibatasi</h2>
        <p className="text-sm text-rose-800 mt-3 leading-relaxed">{accessError}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Card className="border-none ring-1 ring-slate-200 rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl overflow-hidden">
        <div className="p-7 md:p-8 lg:p-10 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-100 ring-1 ring-white/10">
                <BriefcaseBusiness className="w-4 h-4" />
                B2B Pilot Dashboard & Assessment-as-a-Service
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-4 text-balance">
                {selectionTitle}
              </h1>
              <p className="mt-4 text-indigo-100/90 leading-relaxed text-sm md:text-base max-w-3xl">
                Dashboard ini merangkum readiness tier, gap-risk, dan tactical recommendation secara aggregate-first
                agar siap dipakai untuk B2B sekaligus fleksibel untuk model delivery B2B2C.
              </p>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-200/80">
                Role session: {role || 'unknown'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[320px] lg:max-w-[340px]">
              <div className="rounded-3xl bg-white/10 px-4 py-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-100/70">Operating Model</p>
                <p className="text-2xl font-black mt-2">{snapshot.operatingModel}</p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-100/70">B2B2C Ready</p>
                <p className="text-2xl font-black mt-2">{snapshot.b2b2cReadyCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <B2BPilotExportPackButton
              pack={selectedPackage}
              organizationLabel={selectionTitle}
              segmentLabel={selectedSegmentMeta.label}
              snapshot={snapshot}
              pilotOps={pilotOperations}
              successMetrics={successMetrics}
              recommendations={visibleRecommendations}
              portfolio={portfolioSummaries}
              generatedBy={user?.email || user?.uid || 'unknown'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-4">
            <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-100/70">Executive Narrative</p>
              <p className="text-lg font-bold text-white mt-3 leading-relaxed">{narrative}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Aggregate-first
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1.5 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">
                  <Layers3 className="w-3.5 h-3.5" />
                  Multi-tenant aware
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-amber-300/20">
                  <Target className="w-3.5 h-3.5" />
                  Actionable recommendations
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/10 space-y-4">
              <div className="flex items-center gap-2 text-indigo-50">
                <Filter className="w-4 h-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">Pivot Kontrol</p>
              </div>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Tenant / Organization</span>
                <select
                  value={selectedOrganization}
                  onChange={(event) => setSelectedOrganization(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-900/50 px-4 text-sm font-semibold text-white outline-none focus:border-indigo-300"
                >
                  <option value={ALL_ORGANIZATIONS}>Semua organization</option>
                  {organizationOptions.map((organization) => (
                    <option key={organization} value={organization}>
                      {organization}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Segment Pivot</span>
                <select
                  value={selectedDimension}
                  onChange={(event) => setSelectedDimension(event.target.value as SegmentDimension)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-900/50 px-4 text-sm font-semibold text-white outline-none focus:border-indigo-300"
                >
                  {SEGMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Pilot Package</span>
                <select
                  value={selectedPackage}
                  onChange={(event) => setSelectedPackage(event.target.value as DashboardPackage)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-900/50 px-4 text-sm font-semibold text-white outline-none focus:border-indigo-300"
                >
                  {DASHBOARD_PACKAGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-100/70">User Persona</span>
                <select
                  value={selectedPersona}
                  onChange={(event) => setSelectedPersona(event.target.value as DashboardPersona)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-900/50 px-4 text-sm font-semibold text-white outline-none focus:border-indigo-300"
                >
                  {DASHBOARD_PERSONAS.filter((option) => allowedPersonasByRole.includes(option.value)).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-relaxed text-indigo-100/75">
                {selectedSegmentMeta.description} Pivot ini membuat dashboard bisa dipakai untuk buyer B2B murni maupun delivery chain B2B2C.
              </p>
              <p className="text-xs leading-relaxed text-indigo-100/75">
                Scope aktif: <span className="font-black">{selectedPackageMeta.label}</span> ({selectedPackageMeta.description})
              </p>
              <p className="text-xs leading-relaxed text-indigo-100/75">
                Persona aktif: <span className="font-black">{selectedPersonaMeta.label}</span> ({selectedPersonaMeta.description})
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard
          title="Total Participants"
          value={String(snapshot.totalParticipants)}
          hint="Jumlah asesmen yang sudah masuk pada scope pilihan aktif."
          icon={Users2}
          accentClass="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          title="Validated Coverage"
          value={formatPercent(snapshot.totalParticipants > 0 ? (snapshot.validatedCount / snapshot.totalParticipants) * 100 : 0)}
          hint={`${snapshot.validatedCount} assessment sudah tervalidasi kurator.`}
          icon={ShieldCheck}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Analytics Coverage"
          value={formatPercent(snapshot.totalParticipants > 0 ? (snapshot.analyticsCoverageCount / snapshot.totalParticipants) * 100 : 0)}
          hint={`${snapshot.analyticsCoverageCount} assessment sudah memiliki analyticsSummary.`}
          icon={BarChart3}
          accentClass="bg-sky-50 text-sky-600"
        />
        <MetricCard
          title="Average Score"
          value={formatScore(snapshot.avgScore)}
          hint="Menggunakan skor final kurator bila tersedia, lalu fallback ke skor assessment."
          icon={Gauge}
          accentClass="bg-violet-50 text-violet-600"
        />
        <MetricCard
          title="Average Analytics"
          value={formatScore(snapshot.avgAnalyticsScore)}
          hint="Membantu membaca kualitas output analytics lintas tenant."
          icon={TrendingUp}
          accentClass="bg-amber-50 text-amber-600"
        />
        <MetricCard
          title="Dominant Readiness"
          value={snapshot.dominantReadiness}
          hint="Tier readiness yang paling dominan pada data aktif."
          icon={Target}
          accentClass="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr,0.7fr] gap-6">
        <SectionCard
          title="Readiness & Performance Mix"
          subtitle="Ringkasan distribusi tier readiness dan performance band untuk tenant/scope aktif."
          icon={Gauge}
        >
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">Readiness Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={snapshot.readinessDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[12, 12, 0, 0]} fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">Performance Band</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={snapshot.performanceBandDistribution}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {snapshot.performanceBandDistribution.map((entry, index) => (
                        <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>

        {showMetricContract && (
          <SectionCard
            title="Metric Contract MVP"
            subtitle="Kontrak metrik minimum yang sudah diasumsikan untuk membuat dashboard ini tetap traceable dan aman."
            icon={ShieldCheck}
          >
            <div className="space-y-3">
              {[
                'Readiness tier harus datang dari scoring model yang terdokumentasi.',
                'Validated coverage mengukur seberapa banyak data sudah melewati review kurator.',
                'Analytics coverage memeriksa keberadaan analyticsSummary agar kualitas insight tidak over-claimed.',
                'Segment pivot memakai field organisasi yang sudah ada; jika kosong akan masuk ke "Belum dipetakan".',
                'B2B2C readiness dihitung dari keberadaan partner, customer segment, atau channel pada data assessment.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100 text-sm font-medium text-slate-700 leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      <SectionCard
        title="Pilot Operations Layer"
        subtitle="Panel operasional untuk memantau kualitas data, backlog validasi, dan sinyal SLA pilot per scope aktif."
        icon={CircleDashed}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Data Coverage Score</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{pilotOperations.dataCoverageScore}</p>
            <p className="text-xs text-slate-500 mt-2">Rata-rata coverage validasi ({formatPercent(pilotOperations.validatedCoverage)}) dan analytics ({formatPercent(pilotOperations.analyticsCoverage)}).</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Validation Backlog</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{pilotOperations.backlogCount}</p>
            <p className="text-xs text-slate-500 mt-2">Jumlah data yang belum berstatus validated pada tenant aktif.</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Data Quality Gaps</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{pilotOperations.unknownSegmentCount + pilotOperations.unclassifiedReadinessCount}</p>
            <p className="text-xs text-slate-500 mt-2">{pilotOperations.unknownSegmentCount} tanpa segment dan {pilotOperations.unclassifiedReadinessCount} readiness belum terklasifikasi.</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Stale Signals</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{pilotOperations.staleRecordsCount}</p>
            <p className="text-xs text-slate-500 mt-2">{formatPercent(pilotOperations.staleRate)} data terakhir lebih lama dari 45 hari.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200 text-sm text-amber-900">
            <span className="font-black">SLA Attention:</span> {pilotOperations.highPrioritySegments} segmen berstatus High Priority memerlukan intervensi 30 hari.
          </div>
          <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-200 text-sm text-sky-900">
            <span className="font-black">Packaging Active:</span> {selectedPackageMeta.label} untuk persona {selectedPersonaMeta.label}.
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Success Metrics 30-60-90</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Retest Coverage</p>
              <p className="text-xl font-black text-slate-900 mt-1">{formatPercent(successMetrics.retestCoverageRate)}</p>
              <p className="text-xs text-slate-500 mt-1">{successMetrics.retestedEntitiesCount} dari {successMetrics.uniqueEntitiesCount} entitas sudah retest.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Retest Cadence</p>
              <p className="text-xl font-black text-slate-900 mt-1">{successMetrics.avgRetestCadenceDays === null ? '-' : `${successMetrics.avgRetestCadenceDays.toFixed(1)} hari`}</p>
              <p className="text-xs text-slate-500 mt-1">Jarak rata-rata antar 2 assessment terakhir per entitas yang retest.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Improvement Delta</p>
              <p className="text-xl font-black text-slate-900 mt-1">{successMetrics.improvementDeltaAvg === null ? '-' : successMetrics.improvementDeltaAvg.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">Selisih skor terbaru vs baseline pertama pada entitas yang retest.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Closure Rate</p>
              <p className="text-xl font-black text-slate-900 mt-1">{formatPercent(successMetrics.closureRate)}</p>
              <p className="text-xs text-slate-500 mt-1">Segmen high priority yang sudah mencapai indikator closed.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className={`rounded-xl px-3 py-2 ring-1 text-sm ${successMetrics.milestone30.passed ? 'bg-emerald-50 ring-emerald-200 text-emerald-900' : 'bg-amber-50 ring-amber-200 text-amber-900'}`}>
              <p className="font-black">30 Hari: {successMetrics.milestone30.passed ? 'PASS' : 'HOLD'}</p>
              <p className="text-xs mt-1">{successMetrics.milestone30.note}</p>
            </div>
            <div className={`rounded-xl px-3 py-2 ring-1 text-sm ${successMetrics.milestone60.passed ? 'bg-emerald-50 ring-emerald-200 text-emerald-900' : 'bg-amber-50 ring-amber-200 text-amber-900'}`}>
              <p className="font-black">60 Hari: {successMetrics.milestone60.passed ? 'PASS' : 'HOLD'}</p>
              <p className="text-xs mt-1">{successMetrics.milestone60.note}</p>
            </div>
            <div className={`rounded-xl px-3 py-2 ring-1 text-sm ${successMetrics.milestone90.passed ? 'bg-emerald-50 ring-emerald-200 text-emerald-900' : 'bg-amber-50 ring-amber-200 text-amber-900'}`}>
              <p className="font-black">90 Hari: {successMetrics.milestone90.passed ? 'PASS' : 'HOLD'}</p>
              <p className="text-xs mt-1">{successMetrics.milestone90.note}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {canViewCuratorAudit && (
        <SectionCard
          title="Curator Audit Trail"
          subtitle="Jejak aktivitas kurator per tenant: pembukaan draft, finalisasi, dan perubahan tag."
          icon={ShieldCheck}
        >
          <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Action</span>
                <select
                  value={auditActionFilter}
                  onChange={(event) => setAuditActionFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">Semua Action</option>
                  <option value="open_draft">Open Draft</option>
                  <option value="open_assessment">Open Assessment</option>
                  <option value="finalize_assessment">Finalize Assessment</option>
                  <option value="tag_add">Tag Add</option>
                  <option value="tag_remove">Tag Remove</option>
                  <option value="tag_bulk_update">Tag Bulk Update</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Actor</span>
                <input
                  type="text"
                  list="curator-actor-options"
                  value={auditActorFilter}
                  onChange={(event) => setAuditActorFilter(event.target.value)}
                  placeholder="email atau uid"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
                <datalist id="curator-actor-options">
                  {actorFilterOptions.map((actor) => (
                    <option key={actor} value={actor} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Date From</span>
                <input
                  type="date"
                  value={auditDateFrom}
                  onChange={(event) => setAuditDateFrom(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Date To</span>
                <input
                  type="date"
                  value={auditDateTo}
                  onChange={(event) => setAuditDateTo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleExportCuratorAuditCsv}
                  className="h-10 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold w-full"
                >
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Total Events</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{curatorAuditSummary.totalEvents}</p>
              <p className="text-xs text-slate-500 mt-2">Event audit pada scope tenant aktif.</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Active Curators</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{curatorAuditSummary.uniqueCurators}</p>
              <p className="text-xs text-slate-500 mt-2">Jumlah aktor unik yang melakukan aksi curator.</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Draft Opened</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{curatorAuditSummary.openDraftCount}</p>
              <p className="text-xs text-slate-500 mt-2">Jumlah pembukaan draft penilaian.</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Finalize / Tag Edit</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{curatorAuditSummary.finalizeCount} / {curatorAuditSummary.tagEditCount}</p>
              <p className="text-xs text-slate-500 mt-2">Finalisasi assessment dan perubahan tag tenant.</p>
            </div>
          </div>

          {(curatorAuditAbuseSignals.finalizeSpike || curatorAuditAbuseSignals.tagChurnAnomaly || curatorAuditAbuseSignals.actorDominance) && (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200 mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Abuse Indicators</p>
              <div className="text-sm text-rose-900 mt-2 space-y-1">
                {curatorAuditAbuseSignals.finalizeSpike && (
                  <p>
                    Finalize spike terdeteksi: {curatorAuditAbuseSignals.finalizeLast24h} finalize dalam 24 jam (baseline 7 hari: {curatorAuditAbuseSignals.finalizePrevious7dAvg.toFixed(1)} per hari).
                  </p>
                )}
                {curatorAuditAbuseSignals.tagChurnAnomaly && (
                  <p>
                    Tag churn anomali: {curatorAuditAbuseSignals.tagChurnLast24h} perubahan tag dalam 24 jam.
                  </p>
                )}
                {curatorAuditAbuseSignals.actorDominance && (
                  <p>
                    Actor dominance terdeteksi: {curatorAuditAbuseSignals.topActor || 'unknown'} melakukan {curatorAuditAbuseSignals.topActorCount} dari {curatorAuditAbuseSignals.finalizeLast24h} finalisasi 24 jam terakhir.
                  </p>
                )}
              </div>
            </div>
          )}

          {!curatorAuditAbuseSignals.finalizeSpike && !curatorAuditAbuseSignals.tagChurnAnomaly && !curatorAuditAbuseSignals.actorDominance && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200 mb-4 text-sm text-emerald-900">
              Tidak ada indikator abuse signifikan pada 24 jam terakhir untuk scope tenant aktif.
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  <th className="py-3 pr-4">Waktu</th>
                  <th className="py-3 pr-4">Tenant</th>
                  <th className="py-3 pr-4">Action</th>
                  <th className="py-3 pr-4">Assessment</th>
                  <th className="py-3 pr-4">Actor</th>
                  <th className="py-3">Path</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={6}>Memuat audit trail curator...</td>
                  </tr>
                ) : filteredCuratorAudits.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={6}>Belum ada event curator pada scope tenant ini.</td>
                  </tr>
                ) : (
                  filteredCuratorAudits.slice(0, 25).map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50 align-top">
                      <td className="py-3 pr-4 text-slate-600">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{entry.corporateEntity || '-'}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 ring-1 ring-indigo-200">
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 font-mono text-xs">{entry.assessmentId || '-'}</td>
                      <td className="py-3 pr-4 text-slate-700">
                        <p className="font-semibold">{entry.userEmail || entry.userId}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{entry.role || '-'}</p>
                      </td>
                      <td className="py-3 text-xs text-slate-500">{entry.routePath || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[1.15fr,0.85fr] gap-6">
        {showSegmentDiagnostics && (
          <SectionCard
            title="Segment Explorer"
            subtitle={`Distribusi berdasarkan pivot ${selectedSegmentMeta.label.toLowerCase()} untuk menemukan hotspot readiness di level operasional.`}
            icon={Layers3}
          >
          <div className="space-y-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.segmentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]} fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    <th className="py-3 pr-4">Segmen</th>
                    <th className="py-3 pr-4">Participants</th>
                    <th className="py-3 pr-4">Avg Score</th>
                    <th className="py-3 pr-4">Validated</th>
                    <th className="py-3 pr-4">Low Readiness</th>
                    <th className="py-3 pr-4">Priority</th>
                    <th className="py-3">Top Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.segmentSummaries.slice(0, visibleSegmentRows).map((segment) => (
                    <tr key={segment.label} className="border-b border-slate-50 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-black text-slate-900">{segment.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{segment.dominantReadiness}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{segment.count}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{formatScore(segment.avgScore)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{formatPercent(segment.validatedRate)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{formatPercent(segment.lowReadinessRate)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            segment.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                              : segment.priority === 'Medium'
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          }`}
                        >
                          {segment.priority}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {segment.topRisk || segment.topFocus || 'Belum ada sinyal dominan'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </SectionCard>
        )}

        <SectionCard
          title="Gap-Risk Summary"
          subtitle="Sinyal risiko dan focus area yang paling sering muncul dari analyticsSummary."
          icon={AlertTriangle}
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Top Risk Hotspots</p>
              <div className="space-y-3">
                {snapshot.riskHotspots.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500 ring-1 ring-slate-100">
                    Risiko belum banyak terstruktur di analyticsSummary. Dashboard tetap jalan, tetapi kualitas tactical layer akan makin baik jika risk taxonomy dirapikan.
                  </div>
                ) : (
                  snapshot.riskHotspots.map((risk, index) => (
                    <div key={risk.label} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-relaxed">{risk.label}</p>
                          <p className="text-xs text-slate-500 mt-1">Muncul pada {risk.count} assessment.</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Recommended Focus Clusters</p>
              <div className="flex flex-wrap gap-2">
                {snapshot.recommendationFocus.length === 0 ? (
                  <span className="text-sm text-slate-500">Belum ada cluster focus yang terdokumentasi.</span>
                ) : (
                  snapshot.recommendationFocus.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200"
                    >
                      {item.label}
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-indigo-600 ring-1 ring-indigo-100">
                        {item.count}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[0.95fr,1.05fr] gap-6">
        <SectionCard
          title="Tactical Recommendation Board"
          subtitle="Prioritas intervensi yang bisa langsung dipakai untuk HR, leader, atau mitra delivery."
          icon={Sparkles}
        >
          <div className="space-y-4">
            {visibleRecommendations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 text-sm text-slate-500">
                Belum ada cukup data untuk membuat rekomendasi taktis. Pastikan tenant memiliki readiness tier dan analyticsSummary.
              </div>
            ) : (
              visibleRecommendations.map((recommendation) => (
                <div key={recommendation.segment} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{recommendation.segment}</h3>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            recommendation.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                              : recommendation.priority === 'Medium'
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          }`}
                        >
                          {recommendation.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium mt-2">{recommendation.rationale}</p>
                    </div>
                    <Button className="rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold h-10 px-4">
                      Action cue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {recommendation.actions.map((action) => (
                      <div key={action} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 text-sm text-slate-700 font-medium">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {showTrendSignals && (
          <SectionCard
            title="Portfolio Trend & Latest Signals"
            subtitle="Memantau kualitas batch terbaru dan memastikan insight tetap segar untuk review sponsor."
            icon={TrendingUp}
          >
          <div className="space-y-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {snapshot.recentAssessments.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.organization} - {item.segmentLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700 ring-1 ring-indigo-200">
                      {item.readiness}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200">
                      Skor {item.score ?? '-'}
                    </span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
                      {item.status}
                    </span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-slate-500 ring-1 ring-slate-200">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {snapshot.recentAssessments.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 text-sm text-slate-500">
                  Belum ada assessment yang bisa ditampilkan.
                </div>
              )}
            </div>
          </div>
          </SectionCard>
        )}
      </div>

      {showTenantPortfolio && (
        <SectionCard
          title="Tenant Portfolio"
          subtitle="Table ini membantu founder, ops, dan sales melihat tenant mana yang paling siap untuk jalur B2B lanjutan atau B2B2C expansion."
          icon={Building2}
        >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.22em] text-slate-400">
                <th className="py-3 pr-4">Organization</th>
                <th className="py-3 pr-4">Participants</th>
                <th className="py-3 pr-4">Avg Score</th>
                <th className="py-3 pr-4">Dominant Readiness</th>
                <th className="py-3 pr-4">Validated</th>
                <th className="py-3 pr-4">Analytics Coverage</th>
                <th className="py-3">Operating Model</th>
              </tr>
            </thead>
            <tbody>
              {portfolioSummaries.map((item) => (
                <tr key={item.name} className="border-b border-slate-50">
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedOrganization(item.name)}
                      className="font-black text-slate-900 hover:text-indigo-600 transition-colors text-left"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-700">{item.count}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-700">{formatScore(item.avgScore)}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.dominantReadiness}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-700">{formatPercent(item.validatedRate)}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-700">{formatPercent(item.analyticsCoverage)}</td>
                  <td className="py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                      {item.operatingModel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {portfolioSummaries.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 text-sm text-slate-500 mt-4">
              Data tenant belum tersedia. Dashboard ini akan otomatis aktif begitu koleksi <code>assessments</code> memiliki dokumen.
            </div>
          )}
        </div>
        </SectionCard>
      )}

      {showNextBuild && (
        <SectionCard
          title="Recommended Next Build"
          subtitle="MVP ini sudah usable, tetapi masih ada beberapa penguatan supaya benar-benar siap menjadi baseline recurring Assessment-as-a-Service."
          icon={CircleDashed}
        >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Formalize metric contract',
              body: 'Bekukan readiness tier definition, safe display threshold, dan risk taxonomy agar dashboard lebih defensible saat dibawa ke buyer enterprise.',
            },
            {
              title: 'Add role-scoped views',
              body: 'Turunkan page ini menjadi varian HR, leader, dan executive supaya data yang tampil lebih relevan dan aman untuk masing-masing stakeholder.',
            },
            {
              title: 'Create B2B2C partner layer',
              body: 'Tambahkan partner mapping eksplisit di data model agar expansion ke reseller, mitra coaching, atau operator delivery lebih mulus.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <h3 className="text-base font-black text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
        </SectionCard>
      )}
    </div>
  );
}
