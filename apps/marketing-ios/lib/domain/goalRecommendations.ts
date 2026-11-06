import type { KpiKey, MarketingPlatform } from './types';

export type RecommendationScenario = 'conservative' | 'balanced' | 'ambitious';

export interface GoalRecommendation {
  scenario: RecommendationScenario;
  title: string;
  /** Suggested target value (same unit as KPI) */
  suggestedTarget: number;
  /** Suggested horizon in days */
  suggestedHorizonDays: number;
  reasoning: string[];
}

export interface RecommendationInput {
  platform: MarketingPlatform;
  kpiKey: KpiKey;
  /** Recent values for the same KPI (same platform), sorted newest first */
  recentMetricValues: number[];
  /** period length in days for each metric slot (aligned with recentMetricValues) */
  metricPeriodDays: number[];
  /** User capacity: hours per week for marketing */
  hoursPerWeek: number;
  /** Desired deadline in days from today (optional) */
  desiredHorizonDays?: number;
  /** Baseline (e.g. current followers); optional */
  baseline?: number;
}

/**
 * Deterministic rules:
 * - Uses trailing weighted average of deltas when at least 2 periods exist.
 * - Scenarios scale average improvement: 0.9x / 1.15x / 1.45x on expected delta over horizon.
 * - When data is insufficient, uses capacity bands only (clearly labeled).
 */
export function generateGoalRecommendations(input: RecommendationInput): GoalRecommendation[] {
  const horizon =
    input.desiredHorizonDays && input.desiredHorizonDays > 0 ? input.desiredHorizonDays : 30;

  const hasHistory = input.recentMetricValues.length >= 2 && input.metricPeriodDays.length >= 2;

  let avgDeltaPerDay: number | null = null;
  let dataQualityNote = '';

  if (hasHistory) {
    const n = Math.min(input.recentMetricValues.length, input.metricPeriodDays.length);
    const deltas: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const older = input.recentMetricValues[i + 1];
      const newer = input.recentMetricValues[i];
      const days = Math.max(1, input.metricPeriodDays[i] ?? 7);
      deltas.push((newer - older) / days);
    }
    if (deltas.length > 0) {
      avgDeltaPerDay = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
  }

  if (!hasHistory) {
    dataQualityNote =
      'Insufficient overlapping history for this KPI. Targets use your selected weekly capacity only — add metrics to refine recommendations.';
  } else if (avgDeltaPerDay === null) {
    dataQualityNote = 'Could not derive a trend from saved metrics; using capacity defaults.';
  }

  const capFactor = Math.min(1.4, Math.max(0.4, input.hoursPerWeek / 10));

  /** Base target units over horizon when we lack a trend */
  const baseFromCapacity = (): number => {
    if (input.kpiKey === 'published_content') {
      return Math.max(1, Math.round((input.hoursPerWeek / 5) * (horizon / 7)));
    }
    if (input.kpiKey === 'followers' || input.kpiKey === 'follower_growth') {
      return Math.max(5, Math.round(8 * capFactor * (horizon / 30)));
    }
    if (input.kpiKey === 'impressions' || input.kpiKey === 'reach') {
      return Math.max(100, Math.round(500 * capFactor * (horizon / 30)));
    }
    if (input.kpiKey === 'engagement_rate' || input.kpiKey === 'conversion_rate') {
      return Math.round(50 * capFactor * (horizon / 30)) / 100; // percentage points
    }
    return Math.max(10, Math.round(20 * capFactor * (horizon / 30)));
  };

  const expectedFromTrend =
    avgDeltaPerDay !== null ? Math.abs(avgDeltaPerDay) * horizon : baseFromCapacity();

  const mk = (
    scenario: RecommendationScenario,
    mult: number,
    label: string
  ): GoalRecommendation => {
    const suggestedTarget =
      input.baseline !== undefined && input.kpiKey !== 'published_content'
        ? input.baseline + expectedFromTrend * mult
        : expectedFromTrend * mult;

    const reasoning: string[] = [];
    if (dataQualityNote) reasoning.push(dataQualityNote);
    if (avgDeltaPerDay !== null) {
      reasoning.push(
        `Observed average change ≈ ${(avgDeltaPerDay * 7).toFixed(2)} per week over recent periods.`
      );
    } else {
      reasoning.push(
        `Starter range derived from ${input.hoursPerWeek} h/week capacity and KPI type.`
      );
    }
    reasoning.push(
      `Scenario scales expected progress by ${mult}× for the selected ${horizon}-day horizon.`
    );

    return {
      scenario,
      title: label,
      suggestedTarget: Math.round(suggestedTarget * 100) / 100,
      suggestedHorizonDays: horizon,
      reasoning,
    };
  };

  return [
    mk('conservative', 0.9, 'Conservative — maintain or edge above recent run rate'),
    mk('balanced', 1.15, 'Balanced — achievable lift with consistent effort'),
    mk('ambitious', 1.45, 'Ambitious — stretch; assumes more focus or experimental upside'),
  ];
}
