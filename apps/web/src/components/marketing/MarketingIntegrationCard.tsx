import type { MarketingIntegrationStatus } from "@/lib/marketing/types";

const STATE_LABEL: Record<MarketingIntegrationStatus["state"], string> = {
  connected: "Connected",
  setup_required: "Setup required",
  unsupported: "Unsupported",
  error: "Connection error",
};

const STATE_CLASS: Record<MarketingIntegrationStatus["state"], string> = {
  connected: "text-[var(--studio-success)]",
  setup_required: "text-[var(--studio-warning)]",
  unsupported: "text-[var(--studio-text-tertiary)]",
  error: "text-[var(--studio-danger)]",
};

export function MarketingIntegrationCard({ item }: { item: MarketingIntegrationStatus }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--studio-text-primary)]">{item.label}</p>
        <span className={`text-[10px] font-semibold uppercase ${STATE_CLASS[item.state]}`}>{STATE_LABEL[item.state]}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--studio-text-secondary)]">{item.detail}</p>
    </div>
  );
}
