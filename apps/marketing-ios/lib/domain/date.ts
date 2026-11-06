/** ISO date YYYY-MM-DD (local calendar) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function daysBetweenInclusive(start: string, end: string): number {
  const a = parseISODate(start);
  const b = parseISODate(end);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

export function daysRemaining(fromISO: string, deadlineISO: string): number {
  const from = parseISODate(fromISO);
  const end = parseISODate(deadlineISO);
  const ms = end.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Whole weeks (7-day blocks) overlapping [start, end] inclusive */
export function wholeWeeksInRange(startISO: string, endISO: string): number {
  const days = daysBetweenInclusive(startISO, endISO);
  return Math.max(1, Math.ceil(days / 7));
}

export function datesInWeekAround(date: Date): { start: string; end: string } {
  const mon = startOfWeekMonday(date);
  const sun = addDays(mon, 6);
  return { start: toISODate(mon), end: toISODate(sun) };
}
