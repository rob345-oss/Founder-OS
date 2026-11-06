import type { GoalRow, MetricRow } from './types';
import { addDays, daysBetweenInclusive, daysRemaining, parseISODate, toISODate } from './date';

export interface GoalProgressView {
  goal: GoalRow;
  currentValue: number | null;
  /** 0–1 when computable */
  progressRatio: number | null;
  weeklyTarget: number | null;
  requiredPacePerWeek: number | null;
  remainingUnits: number | null;
  /** qualitative note */
  paceNote: string;
}

function latestMetricForGoal(
  metrics: MetricRow[],
  goal: GoalRow,
  asOf: Date
): number | null {
  const iso = toISODate(asOf);
  const filtered = metrics.filter(
    (m) =>
      m.workspace_id === goal.workspace_id &&
      m.platform === goal.platform &&
      m.kpi_key === goal.kpi_key &&
      m.period_end <= iso
  );
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => (a.period_end < b.period_end ? 1 : a.period_end > b.period_end ? -1 : 0));
  return filtered[0].value;
}

/** For follower-style metrics: delta from start baseline */
function currentDeltaFromStart(metrics: MetricRow[], goal: GoalRow, asOf: Date): number | null {
  const start = goal.start_value;
  if (start === null || start === undefined) return null;
  const cur = latestMetricForGoal(metrics, goal, asOf);
  if (cur === null) return null;
  return cur - start;
}

function targetDelta(goal: GoalRow): number {
  const s = goal.start_value ?? 0;
  return goal.target_value - s;
}

export function computeGoalProgress(goal: GoalRow, metrics: MetricRow[], asOf: Date = new Date()): GoalProgressView {
  const iso = toISODate(asOf);
  let currentValue: number | null = null;
  let remainingUnits: number | null = null;
  let progressRatio: number | null = null;

  if (goal.goal_type === 'outcome') {
    if (goal.kpi_key === 'engagement_rate' || goal.kpi_key === 'conversion_rate') {
      const latest = latestMetricForGoal(metrics, goal, asOf);
      currentValue = latest;
      if (latest !== null) {
        const baseline = goal.start_value ?? 0;
        const targetGain = goal.target_value - baseline;
        const actualGain = latest - baseline;
        remainingUnits = Math.max(0, goal.target_value - latest);
        progressRatio = targetGain !== 0 ? Math.min(1, Math.max(0, actualGain / targetGain)) : null;
      }
    } else if (goal.kpi_key === 'followers' || goal.kpi_key === 'impressions' || goal.kpi_key === 'leads') {
      const delta = currentDeltaFromStart(metrics, goal, asOf);
      currentValue = latestMetricForGoal(metrics, goal, asOf);
      const td = targetDelta(goal);
      remainingUnits = delta !== null ? Math.max(0, td - delta) : null;
      progressRatio = delta !== null && td !== 0 ? Math.min(1, Math.max(0, delta / td)) : null;
    } else {
      const latest = latestMetricForGoal(metrics, goal, asOf);
      currentValue = latest;
      if (latest !== null) {
        const baseline = goal.start_value ?? 0;
        const td = goal.target_value - baseline;
        const gained = latest - baseline;
        remainingUnits = Math.max(0, goal.target_value - latest);
        progressRatio = td !== 0 ? Math.min(1, Math.max(0, gained / td)) : null;
      }
    }
  } else {
    // Activity: count published_content metrics in goal window
    const inWindow = metrics.filter(
      (m) =>
        m.workspace_id === goal.workspace_id &&
        m.platform === goal.platform &&
        m.kpi_key === 'published_content' &&
        m.period_start >= goal.start_date &&
        m.period_end <= goal.end_date &&
        m.period_end <= iso
    );
    const count = inWindow.reduce((sum, m) => sum + m.value, 0);
    currentValue = count;
    remainingUnits = Math.max(0, goal.target_value - count);
    progressRatio = goal.target_value > 0 ? Math.min(1, count / goal.target_value) : null;
  }

  const totalDays = daysBetweenInclusive(goal.start_date, goal.end_date);
  const weeks = Math.max(1, Math.ceil(totalDays / 7));
  let weeklyTarget: number | null = null;
  if (goal.goal_type === 'outcome' && goal.start_value !== null) {
    const td = goal.target_value - goal.start_value;
    weeklyTarget = weeks > 0 ? td / weeks : null;
  } else if (goal.goal_type === 'activity') {
    weeklyTarget = goal.target_value / weeks;
  }

  const daysLeft = daysRemaining(iso, goal.end_date);
  let requiredPacePerWeek: number | null = null;
  if (remainingUnits !== null && daysLeft > 0) {
    requiredPacePerWeek = (remainingUnits / daysLeft) * 7;
  }

  let paceNote = '';
  if (progressRatio !== null && progressRatio >= 1) {
    paceNote = 'Target reached for the current measurement window.';
  } else if (requiredPacePerWeek !== null && weeklyTarget !== null && weeklyTarget > 0) {
    const ratio = requiredPacePerWeek / weeklyTarget;
    if (ratio <= 1.05) paceNote = 'On pace vs weekly target.';
    else if (ratio <= 1.4) paceNote = 'Slightly behind — increase consistency.';
    else paceNote = 'Behind pace — focus or extend the timeline.';
  } else {
    paceNote = 'Add metrics to calculate pace.';
  }

  return {
    goal,
    currentValue,
    progressRatio,
    weeklyTarget,
    requiredPacePerWeek,
    remainingUnits,
    paceNote,
  };
}

export function upcomingScheduledContent(
  content: { planned_date: string | null; status: string }[],
  today: Date,
  daysAhead: number
): number {
  const start = toISODate(today);
  const end = toISODate(addDays(today, daysAhead));
  return content.filter((c) => {
    if (!c.planned_date || c.status !== 'scheduled') return false;
    return c.planned_date >= start && c.planned_date <= end;
  }).length;
}
