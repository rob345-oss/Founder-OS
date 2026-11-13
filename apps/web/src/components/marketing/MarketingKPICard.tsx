import Link from "next/link";

import type { MetricAvailability } from "@/lib/marketing/types";

import { Sparkline } from "./Sparkline";

function formatDelta(pct: number | null): string {
  if (pct === null) return "Not enough data";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs prior period`;
}

export function MarketingKPICard({
  label,
  metric,
  href,
  suffix,
}: {
  label: string;
  metric: MetricAvailability;
  href?: string;
  suffix?: string;
}) {
  const body = (
    <div className="group relative overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[var(--studio-border-strong)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(91,140,255,0.12),transparent_70%)]" />
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">{label}</p>
      {metric.status === "live" ? (
        <>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">
            {suffix === "%" ? `${metric.value.toFixed(1)}%` : metric.value.toLocaleString()}
            {suffix && suffix !== "%" ? ` ${suffix}` : ""}
          </p>
          <p
            className={[
              "mt-1 text-xs",
              metric.changePct !== null && metric.changePct >= 0 ? "text-[var(--studio-success)]" : "text-[var(--studio-text-tertiary)]",
            ].join(" ")}
          >
            {formatDelta(metric.changePct)}
          </p>
          <div className="mt-3 h-10">
            <Sparkline points={metric.series} />
          </div>
          {metric.hint ? <p className="mt-2 text-[10px] text-[var(--studio-text-tertiary)]">{metric.hint}</p> : null}
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-[var(--studio-text-secondary)]">{metric.message}</p>
      )}
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block focus:outline-none">
      {body}
    </Link>
  );
}
