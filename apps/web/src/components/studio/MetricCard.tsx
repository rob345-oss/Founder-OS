import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 transition-colors hover:border-[var(--studio-border-strong)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
          {label}
        </p>
        {icon ? <div className="text-[var(--studio-text-tertiary)]">{icon}</div> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[var(--studio-text-primary)]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[var(--studio-text-tertiary)]">{hint}</p> : null}
    </div>
  );
}
