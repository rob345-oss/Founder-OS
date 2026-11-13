import { describe, expect, it } from "vitest";

import { parseMarketingDateRange, percentChange } from "../date-range";

describe("parseMarketingDateRange", () => {
  it("returns 30-day window by default", () => {
    const r = parseMarketingDateRange({});
    expect(r.preset).toBe("30d");
    expect(r.label).toBe("Last 30 days");
    expect(new Date(r.end).getTime()).toBeGreaterThan(new Date(r.start).getTime());
  });

  it("computes previous period with equal span", () => {
    const r = parseMarketingDateRange({ preset: "7d" });
    const span = new Date(r.end).getTime() - new Date(r.start).getTime();
    const prevSpan = new Date(r.previousEnd).getTime() - new Date(r.previousStart).getTime();
    expect(prevSpan).toBe(span);
  });
});

describe("percentChange", () => {
  it("returns null when previous is zero and current is positive", () => {
    expect(percentChange(5, 0)).toBeNull();
  });

  it("computes positive change", () => {
    expect(percentChange(150, 100)).toBe(50);
  });
});
