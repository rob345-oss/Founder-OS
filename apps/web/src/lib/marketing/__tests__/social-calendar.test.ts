import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOCIAL_CALENDAR_TZ,
  addDaysToDateKey,
  buildMonthGrid,
  dateKeyFromIso,
  formatTimeHm,
  rangeForMonthView,
  rescheduleKeepingLocalTime,
  todayDateKey,
  weekStartKeyForDateKey,
  zonedLocalToUtc,
} from "../social-calendar";

const TZ = DEFAULT_SOCIAL_CALENDAR_TZ;

describe("social-calendar timezone", () => {
  it("round-trips Madrid local noon to UTC and back", () => {
    const utc = zonedLocalToUtc("2026-06-15T12:00", TZ);
    expect(dateKeyFromIso(utc.toISOString(), TZ)).toBe("2026-06-15");
    expect(formatTimeHm(utc.toISOString(), TZ)).toBe("12:00");
  });

  it("handles DST spring forward day key", () => {
    const utc = zonedLocalToUtc("2026-03-29T10:30", TZ);
    expect(dateKeyFromIso(utc.toISOString(), TZ)).toBe("2026-03-29");
    expect(formatTimeHm(utc.toISOString(), TZ)).toBe("10:30");
  });

  it("builds month grid with today marker", () => {
    const grid = buildMonthGrid(new Date(), TZ);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toHaveLength(7);
    const today = todayDateKey(TZ);
    const flat = grid.flat();
    expect(flat.some((c) => c.isToday && c.dateKey === today)).toBe(true);
  });

  it("computes week range from monday", () => {
    const start = weekStartKeyForDateKey("2026-11-18", TZ);
    expect(addDaysToDateKey(start, 6)).toBe("2026-11-22");
  });

  it("rescheduleKeepingLocalTime moves day but keeps clock time", () => {
    const iso = zonedLocalToUtc("2026-11-18T09:00", TZ).toISOString();
    const moved = rescheduleKeepingLocalTime(iso, "2026-11-20", TZ);
    expect(dateKeyFromIso(moved, TZ)).toBe("2026-11-20");
    expect(formatTimeHm(moved, TZ)).toBe("09:00");
  });

  it("rangeForMonthView spans full visible grid", () => {
    const anchor = zonedLocalToUtc("2026-11-01T12:00", TZ);
    const { from, to } = rangeForMonthView(anchor, TZ);
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
  });
});