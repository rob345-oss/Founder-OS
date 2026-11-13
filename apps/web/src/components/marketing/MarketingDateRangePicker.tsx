"use client";

import type { MarketingDateRangePreset } from "@/lib/marketing/types";

const PRESETS: { id: MarketingDateRangePreset; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function MarketingDateRangePicker({
  value,
  onChange,
}: {
  value: MarketingDateRangePreset;
  onChange: (preset: MarketingDateRangePreset) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-1"
      role="group"
      aria-label="Date range"
    >
      {PRESETS.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={[
              "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)]"
                : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]",
            ].join(" ")}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
