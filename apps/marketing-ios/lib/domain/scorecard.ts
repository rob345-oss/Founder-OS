import type { ContentItemRow, GoalRow, MetricRow } from './types';
import { computeGoalProgress } from './goalProgress';
import { datesInWeekAround, startOfWeekMonday, toISODate } from './date';

export interface WeeklyScorecardBreakdown {
  goalsCompleted: number;
  goalsOnTrack: number;
  goalsBehind: number;
  postsPlanned: number;
  postsPublished: number;
  audienceGrowth: number | null;
  engagementTrend: 'up' | 'down' | 'flat' | 'unknown';
  leadsInWeek: number | null;
  campaignMilestonesDue: number;
  consistencyIndex: number | null;
}

/**
 * Composite "consistency index" (documented): average of
 * - min(1, published_this_week / max(1, planned_this_week))
 * - share of active goals with progressRatio >= elapsed_ratio - 0.1
 * Not shown as a single headline number in UI unless expanded.
 */
export function buildWeeklyScorecard(
  goals: GoalRow[],
  metrics: MetricRow[],
  content: ContentItemRow[],
  campaignMilestoneDueCount: number,
  weekRef: Date = new Date()
): WeeklyScorecardBreakdown {
  const { start, end } = datesInWeekAround(weekRef);

  const trackedGoals = goals.filter((g) => g.status !== 'paused');
  const completed = goals.filter((g) => g.status === 'completed').length;
  let onTrack = 0;
  let behind = 0;

  const activeGoals = trackedGoals.filter((g) => g.status === 'active' || g.status === 'planned');

  for (const g of activeGoals) {
    const pv = computeGoalProgress(g, metrics, weekRef);
    if (pv.progressRatio !== null && pv.progressRatio >= 1) {
      onTrack++;
      continue;
    }
    const elapsed =
      (parseISODateBoundary(g.end_date) - parseISODateBoundary(g.start_date)) /
        (24 * 60 * 60 * 1000) || 1;
    const fromStart = parseISODateBoundary(g.start_date);
    const now = weekRef.getTime();
    const elapsedRatio = Math.min(1, (now - fromStart) / (elapsed * 24 * 60 * 60 * 1000));
    const pr = pv.progressRatio;
    if (pr === null) {
      behind++;
    } else if (pr + 0.02 >= elapsedRatio) {
      onTrack++;
    } else {
      behind++;
    }
  }

  const postsPlanned = content.filter(
    (c) =>
      c.planned_date &&
      c.planned_date >= start &&
      c.planned_date <= end &&
      (c.status === 'scheduled' || c.status === 'ready')
  ).length;

  const postsPublished = content.filter(
    (c) =>
      c.published_date &&
      c.published_date >= start &&
      c.published_date <= end &&
      c.status === 'published'
  ).length;

  const followerMetrics = metrics
    .filter((m) => m.kpi_key === 'followers' && m.period_end >= start && m.period_end <= end)
    .sort((a, b) => (a.period_end < b.period_end ? -1 : 1));
  let audienceGrowth: number | null = null;
  if (followerMetrics.length >= 2) {
    audienceGrowth =
      followerMetrics[followerMetrics.length - 1].value - followerMetrics[0].value;
  } else if (followerMetrics.length === 1) {
    audienceGrowth = null;
  }

  const eng = metrics
    .filter((m) => m.kpi_key === 'engagements' && m.period_end <= end)
    .sort((a, b) => (a.period_end < b.period_end ? -1 : 1));
  let engagementTrend: WeeklyScorecardBreakdown['engagementTrend'] = 'unknown';
  if (eng.length >= 2) {
    const prev = eng[eng.length - 2].value;
    const last = eng[eng.length - 1].value;
    if (last > prev * 1.05) engagementTrend = 'up';
    else if (last < prev * 0.95) engagementTrend = 'down';
    else engagementTrend = 'flat';
  }

  const leadRow = metrics.find(
    (m) => m.kpi_key === 'leads' && m.period_start >= start && m.period_end <= end
  );
  const leadsInWeek = leadRow ? leadRow.value : null;

  const plannedRatio = postsPlanned > 0 ? postsPublished / postsPlanned : postsPublished > 0 ? 1 : 0;
  const goalRatio =
    activeGoals.length > 0
      ? activeGoals.filter((g) => {
          const pv = computeGoalProgress(g, metrics, weekRef);
          const elapsed =
            (parseISODateBoundary(g.end_date) - parseISODateBoundary(g.start_date)) /
              (24 * 60 * 60 * 1000) || 1;
          const fromStart = parseISODateBoundary(g.start_date);
          const elapsedRatio = Math.min(
            1,
            (weekRef.getTime() - fromStart) / (elapsed * 24 * 60 * 60 * 1000)
          );
          return (pv.progressRatio ?? 0) >= elapsedRatio - 0.1;
        }).length / activeGoals.length
      : null;

  const consistencyIndex =
    goalRatio !== null ? Math.round(100 * (0.5 * plannedRatio + 0.5 * goalRatio)) : null;

  return {
    goalsCompleted: completed,
    goalsOnTrack: onTrack,
    goalsBehind: behind,
    postsPlanned,
    postsPublished,
    audienceGrowth,
    engagementTrend,
    leadsInWeek,
    campaignMilestonesDue: campaignMilestoneDueCount,
    consistencyIndex,
  };
}

function parseISODateBoundary(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function weekStartISO(d: Date = new Date()): string {
  return toISODate(startOfWeekMonday(d));
}
