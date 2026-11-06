import { generateGoalRecommendations } from '@/lib/domain/goalRecommendations';

describe('generateGoalRecommendations', () => {
  it('returns three scenarios with labels', () => {
    const recs = generateGoalRecommendations({
      platform: 'linkedin',
      kpiKey: 'followers',
      recentMetricValues: [1200, 1180, 1160],
      metricPeriodDays: [30, 30, 30],
      hoursPerWeek: 8,
      baseline: 1200,
    });
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.scenario)).toEqual(['conservative', 'balanced', 'ambitious']);
  });

  it('uses capacity when history is thin', () => {
    const recs = generateGoalRecommendations({
      platform: 'linkedin',
      kpiKey: 'followers',
      recentMetricValues: [1000],
      metricPeriodDays: [7],
      hoursPerWeek: 4,
    });
    expect(recs[0].reasoning.some((l) => l.includes('capacity') || l.includes('Insufficient'))).toBe(true);
  });
});
