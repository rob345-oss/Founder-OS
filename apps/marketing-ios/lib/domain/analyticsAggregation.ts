import type { MetricRow, ReportingPeriod } from './types';
import { toISODate } from './date';

export interface ChartPoint {
  label: string;
  value: number;
  /** For legend: measured from platform vs derived */
  kind: 'actual' | 'calculated';
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function endOfQuarter(d: Date): Date {
  const s = startOfQuarter(d);
  return new Date(s.getFullYear(), s.getMonth() + 3, 0);
}

export function filterMetricsByPeriod(
  metrics: MetricRow[],
  period: ReportingPeriod,
  anchor: Date = new Date()
): MetricRow[] {
  let start: Date;
  let end: Date = anchor;

  if (period === 'daily') {
    start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
  } else if (period === 'weekly') {
    const day = anchor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start = new Date(anchor);
    start.setDate(anchor.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === 'monthly') {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  } else {
    start = startOfQuarter(anchor);
    end = endOfQuarter(anchor);
  }

  const s = toISODate(start);
  const e = toISODate(end);

  return metrics.filter((m) => m.period_end >= s && m.period_end <= e);
}

export function latestByPlatformKpi(
  metrics: MetricRow[],
  platform: string,
  kpi: string
): MetricRow | null {
  const sub = metrics.filter((m) => m.platform === platform && m.kpi_key === kpi);
  if (!sub.length) return null;
  sub.sort((a, b) => (a.period_end < b.period_end ? 1 : -1));
  return sub[0];
}

export function metricSeriesForChart(
  metrics: MetricRow[],
  platform: string,
  kpi: string,
  maxPoints = 12
): ChartPoint[] {
  const sub = metrics
    .filter((m) => m.platform === platform && m.kpi_key === kpi)
    .sort((a, b) => (a.period_end > b.period_end ? 1 : -1))
    .slice(0, maxPoints)
    .reverse();

  return sub.map((m) => ({
    label: m.period_end.slice(5),
    value: m.value,
    kind: m.measurement_type === 'calculated' ? 'calculated' : 'actual',
  }));
}

export function growthBetweenLatest(
  metrics: MetricRow[],
  platform: string,
  kpi: string
): number | null {
  const sub = metrics
    .filter((m) => m.platform === platform && m.kpi_key === kpi)
    .sort((a, b) => (a.period_end > b.period_end ? -1 : 1));
  if (sub.length < 2) return null;
  return sub[0].value - sub[1].value;
}
