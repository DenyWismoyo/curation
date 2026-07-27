import { getUniqueRiskLabels, DashboardAssessmentRecord } from '../b2b-dashboard';

describe('getUniqueRiskLabels', () => {
  it('should return an empty array for an empty array input', () => {
    const records: DashboardAssessmentRecord[] = [];
    expect(getUniqueRiskLabels(records)).toEqual([]);
  });

  it('should handle array of records missing aiResult or risks', () => {
    const records: DashboardAssessmentRecord[] = [
      { id: '1', createdAt: '2023-01-01' },
      { id: '2', createdAt: '2023-01-02', aiResult: {} },
      { id: '3', createdAt: '2023-01-03', aiResult: { risks: [] } },
    ];
    expect(getUniqueRiskLabels(records)).toEqual([]);
  });

  it('should handle array of records containing duplicate risk labels', () => {
    const records: DashboardAssessmentRecord[] = [
      { id: '1', createdAt: '2023-01-01', aiResult: { risks: ['Risk A', 'Risk B'] } },
      { id: '2', createdAt: '2023-01-02', aiResult: { risks: ['Risk B', 'Risk C'] } },
      { id: '3', createdAt: '2023-01-03', aiResult: { risks: ['Risk A', 'Risk C'] } },
    ];
    expect(getUniqueRiskLabels(records).sort()).toEqual(['Risk A', 'Risk B', 'Risk C'].sort());
  });

  it('should handle array of records with empty strings or spaces', () => {
    const records: DashboardAssessmentRecord[] = [
      { id: '1', createdAt: '2023-01-01', aiResult: { risks: ['  ', 'Risk A', ''] } },
      { id: '2', createdAt: '2023-01-02', aiResult: { risks: ['Risk A  ', ' Risk B '] } },
    ];

    expect(getUniqueRiskLabels(records).sort()).toEqual(['  ', '', ' Risk B ', 'Risk A', 'Risk A  '].sort());
  });
});