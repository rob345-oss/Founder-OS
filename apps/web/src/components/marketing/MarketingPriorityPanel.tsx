import Link from "next/link";

import type { MarketingPriority } from "@/lib/marketing/types";

const PRIORITY_STYLES: Record<MarketingPriority["priority"], string> = {
  high: "border-red-900/40 bg-red-950/20 text-red-200",
  medium: "border-amber-900/40 bg-amber-950/15 text-amber-100",
  low: "border-[var(--studio-border)] bg-[var(--studio-bg-1)] text-[var(--studio-text-secondary)]",
};

export function MarketingPriorityPanel({ priorities }: { priorities: MarketingPriority[] }) {
  return (
    <section className="studio-panel p-5 md:p-6">
      <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Where to focus next</h2>
      <ul className="mt-4 space-y-3">
        {priorities.map((p) => (
          <li key={p.id} className="rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <PriorityTitle title={p.title} />
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[p.priority]}`}>
                {p.priority}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--studio-text-secondary)]">{p.explanation}</p>
            {p.metric ? <p className="mt-1 text-xs text-[var(--studio-text-tertiary)]">{p.metric}</p> : null}
            <Link href={p.href} className="mt-2 inline-block text-xs font-medium text-[var(--studio-accent)] hover:underline">
              Take action →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriorityTitle({ title }: { title: string }) {
  return <p className="text-sm font-medium text-[var(--studio-text-primary)]">{title}</p>;
}
