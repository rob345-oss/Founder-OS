/** Timezone-aware helpers for the social content calendar (display in local TZ, store UTC). */

export const DEFAULT_SOCIAL_CALENDAR_TZ = "Europe/Madrid";

export type CalendarViewMode = "month" | "week" | "list";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function partsFromIso(iso: string, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(iso))) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
  };
}

export function dateKeyFromIso(iso: string, timeZone: string): string {
  const p = partsFromIso(iso, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatTimeHm(iso: string, timeZone: string): string {
  const p = partsFromIso(iso, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function formatMonthYear(anchor: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, month: "long", year: "numeric" }).format(anchor);
}

export function formatWeekRange(weekStartKey: string, timeZone: string): string {
  const startUtc = zonedLocalToUtc(`${weekStartKey}T00:00`, timeZone);
  const endUtc = zonedLocalToUtc(addDaysToDateKey(weekStartKey, 6) + "T23:59", timeZone);
  const opts: Intl.DateTimeFormatOptions = { timeZone, month: "short", day: "numeric" };
  const a = new Intl.DateTimeFormat("en-GB", opts).format(startUtc);
  const b = new Intl.DateTimeFormat("en-GB", { ...opts, year: "numeric" }).format(endUtc);
  return `${a} – ${b}`;
}

export function todayDateKey(timeZone: string): string {
  return dateKeyFromIso(new Date().toISOString(), timeZone);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function addMonthsToAnchor(anchor: Date, delta: number): Date {
  const out = new Date(anchor);
  out.setUTCMonth(out.getUTCMonth() + delta);
  return out;
}

/** Monday-based week start for a given date key in timezone. */
export function weekStartKeyForDateKey(dateKey: string, timeZone: string): string {
  const noonUtc = zonedLocalToUtc(`${dateKey}T12:00`, timeZone);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(noonUtc);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  return addDaysToDateKey(dateKey, -offset);
}

export type MonthCell = {
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

/** 6×7 grid covering the month that contains `anchor` (interpreted in UTC for navigation). */
export function buildMonthGrid(anchor: Date, timeZone: string): MonthCell[][] {
  const anchorKey = dateKeyFromIso(anchor.toISOString(), timeZone);
  const [y, m] = anchorKey.split("-").map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const start = weekStartKeyForDateKey(firstOfMonth, timeZone);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastOfMonth = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const today = todayDateKey(timeZone);

  const rows: MonthCell[][] = [];
  let cursor = start;
  for (let row = 0; row < 6; row++) {
    const cells: MonthCell[] = [];
    for (let col = 0; col < 7; col++) {
      const inMonth = cursor >= firstOfMonth && cursor <= lastOfMonth;
      cells.push({ dateKey: cursor, inCurrentMonth: inMonth, isToday: cursor === today });
      cursor = addDaysToDateKey(cursor, 1);
    }
    rows.push(cells);
  }
  return rows;
}

export function weekDayKeys(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(weekStartKey, i));
}

export function zonedLocalToUtc(localIsoNoZ: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localIsoNoZ);
  if (!match) throw new Error(`Invalid local datetime: ${localIsoNoZ}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetUtc;
  for (let attempt = 0; attempt < 10; attempt++) {
    const got = partsFromIso(new Date(guess).toISOString(), timeZone);
    const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
    const diffMs = targetUtc - gotUtc;
    if (diffMs === 0) return new Date(guess);
    guess += diffMs;
  }
  return new Date(guess);
}

export function utcToZonedLocalFields(iso: string, timeZone: string): { dateKey: string; time: string } {
  return { dateKey: dateKeyFromIso(iso, timeZone), time: formatTimeHm(iso, timeZone) };
}

export function rangeForMonthView(anchor: Date, timeZone: string): { from: string; to: string } {
  const grid = buildMonthGrid(anchor, timeZone);
  const fromKey = grid[0][0].dateKey;
  const toKey = grid[5][6].dateKey;
  const from = zonedLocalToUtc(`${fromKey}T00:00`, timeZone).toISOString();
  const to = zonedLocalToUtc(`${addDaysToDateKey(toKey, 1)}T00:00`, timeZone).toISOString();
  return { from, to };
}

export function rangeForWeekView(weekStartKey: string, timeZone: string): { from: string; to: string } {
  const from = zonedLocalToUtc(`${weekStartKey}T00:00`, timeZone).toISOString();
  const to = zonedLocalToUtc(`${addDaysToDateKey(weekStartKey, 7)}T00:00`, timeZone).toISOString();
  return { from, to };
}

export function minutesFromMidnight(iso: string, timeZone: string): number {
  const p = partsFromIso(iso, timeZone);
  return p.hour * 60 + p.minute;
}

export function rescheduleKeepingLocalTime(
  existingIso: string,
  newDateKey: string,
  timeZone: string,
  newMinutes?: number,
): string {
  const mins = newMinutes ?? minutesFromMidnight(existingIso, timeZone);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const local = `${newDateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return zonedLocalToUtc(local, timeZone).toISOString();
}

export function displayEventInstant(post: { scheduledAt: string | null; publishedAt: string | null; status: string }): string | null {
  if (post.status === "published" && post.publishedAt) return post.publishedAt;
  return post.scheduledAt;
}

export function isPostDraggable(status: string): boolean {
  return status !== "published" && status !== "publishing" && status !== "canceled";
}