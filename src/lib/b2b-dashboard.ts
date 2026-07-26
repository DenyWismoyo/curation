export interface DashboardAnalyticsSummary {
  performanceScore?: number;
  performanceBand?: string;
  version?: string;
  dimensions?: Record<string, number | undefined>;
  summary?: {
    headline?: string;
    keyFindings?: string[];
    recommendedFocus?: string[];
  };
  risks?: string[];
}

export interface DashboardCuratorAssessment {
  verifiedScore?: number;
  verifiedLevel?: string;
}

export interface DashboardAssessmentRecord {
  id: string;
  createdAt: string;
  corporateEntity?: string;
  trackType?: string;
  namaUsaha?: string;
  status?: string;
  score?: number;
  readinessLevel?: string;
  formData?: Record<string, unknown>;
  analyticsSummary?: DashboardAnalyticsSummary;
  curatorAssessment?: DashboardCuratorAssessment;
}

export type SegmentDimension =
  | 'division'
  | 'function'
  | 'level'
  | 'location'
  | 'cohort'
  | 'partner'
  | 'customerSegment'
  | 'channel';

export interface SegmentOption {
  value: SegmentDimension;
  label: string;
  description: string;
}

export interface DistributionDatum {
  label: string;
  count: number;
}

export interface TrendDatum {
  label: string;
  score: number;
}

export interface RiskDatum {
  label: string;
  count: number;
}

export interface RecentAssessmentDatum {
  id: string;
  name: string;
  organization: string;
  readiness: string;
  score: number | null;
  status: string;
  createdAt: string;
  segmentLabel: string;
}

export interface RecommendationDatum {
  segment: string;
  priority: 'High' | 'Medium' | 'Healthy';
  rationale: string;
  actions: string[];
}

export interface SegmentSummary {
  label: string;
  count: number;
  avgScore: number | null;
  avgAnalyticsScore: number | null;
  validatedRate: number;
  lowReadinessRate: number;
  dominantReadiness: string;
  topRisk: string | null;
  topFocus: string | null;
  priority: 'High' | 'Medium' | 'Healthy';
  actions: string[];
}

export interface OrganizationSummary {
  name: string;
  count: number;
  avgScore: number | null;
  dominantReadiness: string;
  validatedRate: number;
  analyticsCoverage: number;
  operatingModel: 'Public' | 'B2B' | 'B2B2C';
}

export interface B2BDashboardSnapshot {
  totalParticipants: number;
  validatedCount: number;
  draftCount: number;
  analyticsCoverageCount: number;
  b2b2cReadyCount: number;
  avgScore: number | null;
  avgAnalyticsScore: number | null;
  dominantReadiness: string;
  operatingModel: 'Public' | 'B2B' | 'B2B2C';
  readinessDistribution: DistributionDatum[];
  performanceBandDistribution: DistributionDatum[];
  trackDistribution: DistributionDatum[];
  segmentDistribution: DistributionDatum[];
  scoreTrend: TrendDatum[];
  riskHotspots: RiskDatum[];
  recommendationFocus: RiskDatum[];
  segmentSummaries: SegmentSummary[];
  tacticalRecommendations: RecommendationDatum[];
  recentAssessments: RecentAssessmentDatum[];
}

export const SEGMENT_OPTIONS: SegmentOption[] = [
  { value: 'division', label: 'Divisi', description: 'Membaca readiness per divisi atau department.' },
  { value: 'function', label: 'Fungsi', description: 'Melihat gap per fungsi atau business unit.' },
  { value: 'level', label: 'Level', description: 'Membandingkan senioritas atau grade peserta.' },
  { value: 'location', label: 'Lokasi', description: 'Menemukan hotspot per cabang, kota, atau wilayah.' },
  { value: 'cohort', label: 'Cohort', description: 'Memantau batch, program, atau reporting cycle.' },
  { value: 'partner', label: 'Partner / Channel', description: 'Mendukung model delivery B2B2C via partner.' },
  { value: 'customerSegment', label: 'Customer Segment', description: 'Membaca segmen end-customer di B2B2C.' },
  { value: 'channel', label: 'Channel', description: 'Melihat persebaran distribusi atau acquisition channel.' },
];

const UNKNOWN_LABEL = 'Belum dipetakan';
const PUBLIC_ORGANIZATION = 'Program Umum (Publik)';

const DIMENSION_KEYS: Record<SegmentDimension, string[]> = {
  division: ['division', 'divisi', 'department', 'departemen', 'unit', 'team', 'tim'],
  function: ['function', 'fungsi', 'businessUnit', 'business_unit', 'unitBisnis', 'unit_bisnis'],
  level: ['level', 'grade', 'jobLevel', 'job_level', 'seniority', 'positionLevel'],
  location: ['location', 'lokasi', 'city', 'kota', 'branch', 'cabang', 'region', 'wilayah', 'area'],
  cohort: ['cohort', 'angkatan', 'batch', 'program', 'cycle', 'assessmentCycle', 'assessment_cycle'],
  partner: ['partner', 'mitra', 'reseller', 'channelPartner', 'channel_partner', 'agencyPartner'],
  customerSegment: ['customerSegment', 'customer_segment', 'segmenPelanggan', 'segmen_pelanggan', 'targetSegment'],
  channel: ['channel', 'channels', 'deliveryChannel', 'delivery_channel', 'distributionChannel', 'distribution_channel'],
};

const LOW_READINESS_KEYWORDS = ['rendah', 'low', 'rawan', 'risk', 'foundational', 'critical', 'belum siap', 'emerging'];

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toStringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value
        .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry) : ''))
        .filter(Boolean),
    );
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return [];
    }

    if (text.includes(',') || text.includes(';')) {
      return uniqueStrings(text.split(/[;,]/g));
    }

    return [text];
  }

  if (typeof value === 'number') {
    return [String(value)];
  }

  return [];
}

function findValue(source: Record<string, unknown> | null, keys: string[]): unknown {
  if (!source) {
    return undefined;
  }

  const lookup = new Map<string, unknown>();
  Object.entries(source).forEach(([key, value]) => {
    lookup.set(normalizeLookupKey(key), value);
  });

  for (const key of keys) {
    const match = lookup.get(normalizeLookupKey(key));
    if (match !== undefined && match !== null && match !== '') {
      return match;
    }
  }

  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeFirestoreDate(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'toDate' in (raw as Record<string, unknown>)) {
    const maybeDateFn = (raw as { toDate?: () => Date }).toDate;
    if (typeof maybeDateFn === 'function') {
      try {
        const resolved = maybeDateFn.call(raw);
        if (resolved instanceof Date && !Number.isNaN(resolved.getTime())) {
          return resolved.toISOString();
        }
      } catch {
        // Fallback ke parser berikutnya jika objek timestamp tidak valid.
      }
    }
  }

  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export function getOrganizationName(record: DashboardAssessmentRecord): string {
  return record.corporateEntity?.trim() || PUBLIC_ORGANIZATION;
}

export function getEffectiveScore(record: DashboardAssessmentRecord): number | null {
  return (
    toFiniteNumber(record.curatorAssessment?.verifiedScore)
    ?? toFiniteNumber(record.score)
    ?? toFiniteNumber(record.analyticsSummary?.performanceScore)
  );
}

export function getAnalyticsScore(record: DashboardAssessmentRecord): number | null {
  return toFiniteNumber(record.analyticsSummary?.performanceScore);
}

export function getReadinessLabel(record: DashboardAssessmentRecord): string {
  const raw = record.curatorAssessment?.verifiedLevel || record.readinessLevel || '';
  const clean = raw.split('|')[0]?.trim();
  return clean || 'Belum terklasifikasi';
}

export function getPerformanceBand(record: DashboardAssessmentRecord): string {
  return record.analyticsSummary?.performanceBand?.trim() || 'Belum tersedia';
}

export function getStatusLabel(record: DashboardAssessmentRecord): string {
  if (record.status === 'Curator_Validated') {
    return 'Validated';
  }

  if (record.status === 'Curator_Draft') {
    return 'Draft';
  }

  if (record.status?.trim()) {
    return record.status.trim();
  }

  return 'AI Complete';
}

export function getPrimarySegmentValue(record: DashboardAssessmentRecord, dimension: SegmentDimension): string {
  const topLevelValue = findValue(record as unknown as Record<string, unknown>, DIMENSION_KEYS[dimension]);
  const formDataValue = findValue(record.formData ?? null, DIMENSION_KEYS[dimension]);
  const values = uniqueStrings([
    ...toStringValues(topLevelValue),
    ...toStringValues(formDataValue),
  ]);

  if (values.length === 0) {
    return UNKNOWN_LABEL;
  }

  if (dimension === 'channel' && values.length > 1) {
    return `Multi-channel (${values.length})`;
  }

  return values[0];
}

function hasB2B2CSignal(record: DashboardAssessmentRecord): boolean {
  return ['partner', 'customerSegment', 'channel'].some((dimension) => {
    const value = getPrimarySegmentValue(record, dimension as SegmentDimension);
    return value !== UNKNOWN_LABEL;
  });
}

function inferOperatingModel(records: DashboardAssessmentRecord[]): 'Public' | 'B2B' | 'B2B2C' {
  if (records.length === 0) {
    return 'Public';
  }

  const hasTenant = records.some((record) => getOrganizationName(record) !== PUBLIC_ORGANIZATION);
  const hasB2B2C = records.some((record) => hasB2B2CSignal(record));

  if (hasB2B2C) {
    return 'B2B2C';
  }

  if (hasTenant) {
    return 'B2B';
  }

  return 'Public';
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length === 0) {
    return null;
  }

  const total = valid.reduce((sum, value) => sum + value, 0);
  return Math.round((total / valid.length) * 10) / 10;
}

function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

function groupCounts(labels: string[]): DistributionDatum[] {
  const counts = labels.reduce<Record<string, number>>((accumulator, label) => {
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function topCounts(values: string[], limit: number): RiskDatum[] {
  return groupCounts(values)
    .slice(0, limit)
    .map((item) => ({ label: item.label, count: item.count }));
}

function isLowReadiness(label: string, score: number | null): boolean {
  const normalized = label.toLowerCase();
  if (LOW_READINESS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  return score !== null && score < 55;
}

function dominantLabel(labels: string[]): string {
  return groupCounts(labels)[0]?.label || 'Belum terklasifikasi';
}

function summarizeRiskList(records: DashboardAssessmentRecord[]): string[] {
  const risks = records.flatMap((record) => record.analyticsSummary?.risks || []);
  return uniqueStrings(risks);
}

function summarizeFocusList(records: DashboardAssessmentRecord[]): string[] {
  const focus = records.flatMap((record) => record.analyticsSummary?.summary?.recommendedFocus || []);
  return uniqueStrings(focus);
}

function buildActions(
  segmentLabel: string,
  dimensionLabel: string,
  avgScore: number | null,
  lowReadinessRate: number,
  validatedRate: number,
  topRisk: string | null,
  topFocus: string | null,
): string[] {
  const actions: string[] = [];

  if (avgScore !== null && avgScore < 55) {
    actions.push(`Prioritaskan coaching dan advisory untuk ${dimensionLabel.toLowerCase()} ${segmentLabel} karena skor rata-rata masih ${avgScore}.`);
  } else if (avgScore !== null && avgScore < 70) {
    actions.push(`Jalankan mentoring terstruktur untuk ${dimensionLabel.toLowerCase()} ${segmentLabel} agar readiness naik pada siklus berikutnya.`);
  } else {
    actions.push(`Gunakan ${segmentLabel} sebagai champion cohort untuk menyebarkan praktik yang sudah sehat.`);
  }

  if (lowReadinessRate >= 35) {
    actions.push(`Masukkan ${segmentLabel} ke prioritas 30 hari pertama karena ${lowReadinessRate}% anggota berada di tier readiness rendah.`);
  }

  if (validatedRate < 70) {
    actions.push(`Naikkan coverage validasi untuk ${segmentLabel}; baru ${validatedRate}% data yang tervalidasi kurator.`);
  }

  if (topRisk) {
    actions.push(`Rancang playbook intervensi terhadap risiko "${topRisk}" agar insight dapat diturunkan menjadi action plan lintas stakeholder.`);
  } else if (topFocus) {
    actions.push(`Gunakan fokus "${topFocus}" sebagai tema workshop atau capability sprint berikutnya.`);
  }

  return actions.slice(0, 3);
}

function buildSegmentSummary(records: DashboardAssessmentRecord[], dimension: SegmentDimension): SegmentSummary[] {
  const map = new Map<string, DashboardAssessmentRecord[]>();

  records.forEach((record) => {
    const label = getPrimarySegmentValue(record, dimension);
    const group = map.get(label) || [];
    group.push(record);
    map.set(label, group);
  });

  const dimensionLabel = SEGMENT_OPTIONS.find((item) => item.value === dimension)?.label || 'Segmen';

  return [...map.entries()]
    .map(([label, group]) => {
      const scores = group.map(getEffectiveScore);
      const readinessLabels = group.map(getReadinessLabel);
      const lowReadinessCount = group.filter((record) => isLowReadiness(getReadinessLabel(record), getEffectiveScore(record))).length;
      const validatedCount = group.filter((record) => getStatusLabel(record) === 'Validated').length;
      const topRisk = topCounts(group.flatMap((record) => record.analyticsSummary?.risks || []), 1)[0]?.label || null;
      const topFocus = topCounts(group.flatMap((record) => record.analyticsSummary?.summary?.recommendedFocus || []), 1)[0]?.label || null;
      const avgScore = average(scores);
      const lowReadinessRate = percentage(lowReadinessCount, group.length);
      const validatedRate = percentage(validatedCount, group.length);

      let priority: 'High' | 'Medium' | 'Healthy' = 'Healthy';
      if ((avgScore !== null && avgScore < 55) || lowReadinessRate >= 35) {
        priority = 'High';
      } else if ((avgScore !== null && avgScore < 70) || lowReadinessRate >= 20) {
        priority = 'Medium';
      }

      return {
        label,
        count: group.length,
        avgScore,
        avgAnalyticsScore: average(group.map(getAnalyticsScore)),
        validatedRate,
        lowReadinessRate,
        dominantReadiness: dominantLabel(readinessLabels),
        topRisk,
        topFocus,
        priority,
        actions: buildActions(label, dimensionLabel, avgScore, lowReadinessRate, validatedRate, topRisk, topFocus),
      };
    })
    .sort((left, right) => {
      const priorityWeight = { High: 3, Medium: 2, Healthy: 1 };
      return (
        priorityWeight[right.priority] - priorityWeight[left.priority]
        || right.count - left.count
        || (right.avgScore ?? 0) - (left.avgScore ?? 0)
      );
    });
}

function buildRecommendations(segmentSummaries: SegmentSummary[]): RecommendationDatum[] {
  return segmentSummaries.slice(0, 5).map((segment) => ({
    segment: segment.label,
    priority: segment.priority,
    rationale: `${segment.count} peserta | readiness dominan: ${segment.dominantReadiness}${segment.avgScore !== null ? ` | skor rata-rata ${segment.avgScore}` : ''}`,
    actions: segment.actions,
  }));
}

function buildRecentAssessments(records: DashboardAssessmentRecord[], dimension: SegmentDimension): RecentAssessmentDatum[] {
  return [...records]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
    .map((record) => ({
      id: record.id,
      name: record.namaUsaha?.trim() || 'Entitas tanpa nama',
      organization: getOrganizationName(record),
      readiness: getReadinessLabel(record),
      score: getEffectiveScore(record),
      status: getStatusLabel(record),
      createdAt: record.createdAt,
      segmentLabel: getPrimarySegmentValue(record, dimension),
    }));
}

export function getOrganizationOptions(records: DashboardAssessmentRecord[]): string[] {
  return uniqueStrings(records.map(getOrganizationName)).sort((left, right) => left.localeCompare(right));
}

export function buildOrganizationSummaries(records: DashboardAssessmentRecord[]): OrganizationSummary[] {
  const groups = new Map<string, DashboardAssessmentRecord[]>();

  records.forEach((record) => {
    const orgName = getOrganizationName(record);
    const group = groups.get(orgName) || [];
    group.push(record);
    groups.set(orgName, group);
  });

  return [...groups.entries()]
    .map(([name, group]) => ({
      name,
      count: group.length,
      avgScore: average(group.map(getEffectiveScore)),
      dominantReadiness: dominantLabel(group.map(getReadinessLabel)),
      validatedRate: percentage(group.filter((record) => getStatusLabel(record) === 'Validated').length, group.length),
      analyticsCoverage: percentage(group.filter((record) => getAnalyticsScore(record) !== null).length, group.length),
      operatingModel: inferOperatingModel(group),
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function buildB2BDashboardSnapshot(
  records: DashboardAssessmentRecord[],
  dimension: SegmentDimension,
): B2BDashboardSnapshot {
  const segmentSummaries = buildSegmentSummary(records, dimension);

  return {
    totalParticipants: records.length,
    validatedCount: records.filter((record) => getStatusLabel(record) === 'Validated').length,
    draftCount: records.filter((record) => getStatusLabel(record) === 'Draft').length,
    analyticsCoverageCount: records.filter((record) => getAnalyticsScore(record) !== null).length,
    b2b2cReadyCount: records.filter((record) => hasB2B2CSignal(record)).length,
    avgScore: average(records.map(getEffectiveScore)),
    avgAnalyticsScore: average(records.map(getAnalyticsScore)),
    dominantReadiness: dominantLabel(records.map(getReadinessLabel)),
    operatingModel: inferOperatingModel(records),
    readinessDistribution: groupCounts(records.map(getReadinessLabel)).slice(0, 8),
    performanceBandDistribution: groupCounts(records.map(getPerformanceBand)).slice(0, 8),
    trackDistribution: groupCounts(records.map((record) => record.trackType?.trim() || 'Assessment lain')).slice(0, 8),
    segmentDistribution: groupCounts(records.map((record) => getPrimarySegmentValue(record, dimension))).slice(0, 8),
    scoreTrend: [...records]
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .slice(-8)
      .map((record, index) => ({
        label: `T${index + 1}`,
        score: getEffectiveScore(record) ?? 0,
      })),
    riskHotspots: topCounts(records.flatMap((record) => record.analyticsSummary?.risks || []), 6),
    recommendationFocus: topCounts(records.flatMap((record) => record.analyticsSummary?.summary?.recommendedFocus || []), 6),
    segmentSummaries,
    tacticalRecommendations: buildRecommendations(segmentSummaries),
    recentAssessments: buildRecentAssessments(records, dimension),
  };
}

export function buildSummaryNarrative(snapshot: B2BDashboardSnapshot): string {
  const participantText = `${snapshot.totalParticipants} partisipan`;
  const readinessText = `readiness dominan ${snapshot.dominantReadiness}`;
  const scoreText = snapshot.avgScore !== null ? `skor rata-rata ${snapshot.avgScore}` : 'skor rata-rata belum tersedia';
  return `${participantText}, ${readinessText}, ${scoreText}. Mode operasi saat ini: ${snapshot.operatingModel}.`;
}

export function getUniqueRiskLabels(records: DashboardAssessmentRecord[]): string[] {
  return summarizeRiskList(records);
}

export function getUniqueFocusLabels(records: DashboardAssessmentRecord[]): string[] {
  return summarizeFocusList(records);
}
