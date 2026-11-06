import type { KpiKey, MarketingPlatform, MeasurementType } from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';
export interface ParsedMetricRow {
  id?: string;
  platform: MarketingPlatform;
  kpi_key: KpiKey;
  value: number;
  period_start: string;
  period_end: string;
  measurement_type: MeasurementType;
  source: string;
}

/**
 * Expected headers (case-insensitive): platform, kpi, value, period_start, period_end [, measurement_type]
 * measurement_type: actual | calculated (default actual)
 */
export function parseMetricsCsv(text: string): ParsedMetricRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.');
  }
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const platformI = idx('platform');
  const kpiI = idx('kpi');
  const valueI = idx('value');
  const startI = idx('period_start');
  const endI = idx('period_end');
  const mtI = idx('measurement_type');

  if (platformI < 0 || kpiI < 0 || valueI < 0 || startI < 0 || endI < 0) {
    throw new Error('CSV must include: platform, kpi, value, period_start, period_end');
  }

  const out: ParsedMetricRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const platform = cols[platformI]?.trim() as MarketingPlatform;
    const kpi = cols[kpiI]?.trim() as KpiKey;
    const value = Number(cols[valueI]);
    const period_start = normalizeDate(cols[startI]?.trim());
    const period_end = normalizeDate(cols[endI]?.trim());
    const mtRaw = mtI >= 0 ? cols[mtI]?.trim().toLowerCase() : 'actual';
    const measurement_type: MeasurementType = mtRaw === 'calculated' ? 'calculated' : 'actual';

    if (!platform || !kpi || Number.isNaN(value)) continue;

    out.push({
      platform,
      kpi_key: kpi,
      value,
      period_start,
      period_end,
      measurement_type,
      source: 'csv_import',
    });
  }
  return out;
}

function normalizeDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return toISODate(new Date());
  }
  return toISODate(d);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}
