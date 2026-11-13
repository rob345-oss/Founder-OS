"use client";

import { useMemo, useState } from "react";

import type { MarketingGrowthSeriesKey, MetricAvailability } from "@/lib/marketing/types";

import { AreaChart } from "./AreaChart";

const LABELS: Record<MarketingGrowthSeriesKey, string> = {
  visitors: "Website visitors",
  waitlist: "Waitlist registrations",
  leads: "Qualified leads",
  customers: "Paying customers",
};

export function MarketingGrowthChart({
  series,
  insight,
}: {
  series: Record<MarketingGrowthSeriesKey, MetricAvailability>;
  insight: string | null;
}) {
  const [active, setActive] = useState<MarketingGrowthSeriesKey>("waitlist");
  const metric = series[active];

  const points = useMemo(() => (metric.status === "live" ? metric.series : []), [metric]);

  return (
    <section className="studio-panel p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">Growth</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--studio-text-primary)]">Titanium Guardian Growth</h2>
        </div>
        <div className="flex flex-wrap gap-1 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-1">
          {(Object.keys(LABELS) as MarketingGrowthSeriesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={[
                "rounded-[8px] px-2.5 py-1 text-xs font-medium",
                active === key
                  ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)]"
                  : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]",
              ].join(" ")}
            >
              {LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 min-h-[220px]">
        {metric.status === "live" ? (
          <AreaChart points={points} label={LABELS[active]} />
        ) : (
          <p className="text-sm text-[var(--studio-text-secondary)]">{metric.message}</p>
        )}
      </div>

      {insight ? <p className="mt-4 text-sm text-[var(--studio-text-secondary)]">{insight}</p> : null}
    </section>
  );
}
