export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--studio-text-tertiary)]">{hint}</p> : null}
    </div>
  );
}
