import { buildSummaryNarrative, B2BDashboardSnapshot } from '../b2b-dashboard';

describe('buildSummaryNarrative', () => {
  it('should return correct string when avgScore is a valid number', () => {
    const snapshot = {
      totalParticipants: 10,
      dominantReadiness: 'High',
      avgScore: 85,
      operatingModel: 'B2B',
    } as B2BDashboardSnapshot;

    const result = buildSummaryNarrative(snapshot);
    expect(result).toBe('10 partisipan, readiness dominan High, skor rata-rata 85. Mode operasi saat ini: B2B.');
  });

  it('should return correct string when avgScore is null', () => {
    const snapshot = {
      totalParticipants: 15,
      dominantReadiness: 'Medium',
      avgScore: null,
      operatingModel: 'Public',
    } as B2BDashboardSnapshot;

    const result = buildSummaryNarrative(snapshot);
    expect(result).toBe('15 partisipan, readiness dominan Medium, skor rata-rata belum tersedia. Mode operasi saat ini: Public.');
  });
});
