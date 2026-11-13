import type { MarketingDateRange, MarketingDateRangePreset } from "./types";

const PRESET_DAYS: Record<Exclude<MarketingDateRangePreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function toIso(d: Date): string {
  return d.toISOString();
}

export function parseMarketingDateRange(input: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
}): MarketingDateRange {
  const presetRaw = (input.preset ?? "30d").trim() as MarketingDateRangePreset;
  const preset: MarketingDateRangePreset =
    presetRaw === "7d" || presetRaw === "30d" || presetRaw === "90d" || presetRaw === "custom" ? presetRaw : "30d";

  const endExclusive = startOfDayUtc(addDays(new Date(), 1));

  if (preset === "custom" && input.start && input.end) {
    const start = startOfDayUtc(new Date(input.start));
    const end = startOfDayUtc(addDays(new Date(input.end), 1));
    const spanMs = end.getTime() - start.getTime();
    const previousEnd = new Date(start);
    const previousStart = new Date(start.getTime() - spanMs);
    return {
      preset,
      start: toIso(start),
      end: toIso(end),
      previousStart: toIso(previousStart),
      previousEnd: toIso(previousEnd),
      label: "Custom range",
    };
  }

  const days = PRESET_DAYS[preset === "custom" ? "30d" : preset];
  const start = addDays(endExclusive, -days);
  const previousEnd = new Date(start);
  const previousStart = addDays(start, -days);

  const labels: Record<Exclude<MarketingDateRangePreset, "custom">, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
  };

  return {
    preset: preset === "custom" ? "30d" : preset,
    start: toIso(start),
    end: toIso(endExclusive),
    previousStart: toIso(previousStart),
    previousEnd: toIso(previousEnd),
    label: labels[preset === "custom" ? "30d" : preset],
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export function buildDailySeries(
  buckets: Map<string, number>,
  startIso: string,
  endIso: string,
): { date: string; value: number }[] {
  const start = startOfDayUtc(new Date(startIso));
  const end = startOfDayUtc(new Date(endIso));
  const out: { date: string; value: number }[] = [];
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: buckets.get(key) ?? 0 });
  }
  return out;
}
