import Link from "next/link";

import type { FunnelStage } from "@/lib/marketing/types";

export function MarketingAcquisitionFunnel({
  stages,
  limitation,
}: {
  stages: FunnelStage[];
  limitation?: string;
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <section className="studio-panel p-5 md:p-6">
      <FunnelHeader />
      <div className="mt-6 space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(12, (stage.count / max) * 100);
          return (
            <Link
              key={stage.key}
              href={stage.href}
              className="group block rounded-[var(--studio-radius-md)] border border-transparent px-1 py-1 transition-colors hover:border-[var(--studio-border)]"
            >
              <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[var(--studio-text-primary)]">{stage.label}</p>
                  {stage.note ? (
                    <p className="text-[10px] text-[var(--studio-text-tertiary)]">{stage.note}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-[var(--studio-text-secondary)]">
                  <span className="font-semibold text-[var(--studio-text-primary)]">{stage.count.toLocaleString()}</span>
                  {idx > 0 && stage.conversionFromPrevious !== null ? (
                    <span className="ml-2 text-[var(--studio-text-tertiary)]">
                      {stage.conversionFromPrevious.toFixed(1)}% step conv.
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="h-9 overflow-hidden rounded-[var(--studio-radius-sm)] bg-[var(--studio-bg-3)]">
                <div
                  className="flex h-full items-center bg-gradient-to-r from-[rgba(91,140,255,0.55)] to-[rgba(130,100,255,0.35)] px-3 text-[10px] font-medium text-white transition-all group-hover:from-[rgba(91,140,255,0.7)]"
                  style={{ width: `${widthPct}%` }}
                >
                  {stage.dropOffPct !== null && stage.dropOffPct > 0 ? `−${stage.dropOffPct.toFixed(0)}% drop` : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {limitation ? <p className="mt-4 text-xs leading-relaxed text-[var(--studio-text-tertiary)]">{limitation}</p> : null}
      <div className="mt-4">
        <Link href="/marketing/growth" className="text-xs font-medium text-[var(--studio-accent)] hover:underline">
          Open conversion intelligence →
        </Link>
      </div>
    </section>
  );
}

function FunnelHeader() {
  return (
    <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Marketing acquisition funnel</h2>
  );
}
