import Link from "next/link";

import type { MarketingActivityItem } from "@/lib/marketing/types";

import { MarketingEmptyState } from "./MarketingEmptyState";

export function MarketingActivityFeed({ items }: { items: MarketingActivityItem[] }) {
  return (
    <section className="studio-panel p-5 md:p-6">
      <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Marketing activity</h2>
      {items.length === 0 ? (
        <div className="mt-4">
          <MarketingEmptyState
            title="No recent activity"
            description="CRM sync and marketing operations will appear here as persisted events."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5">
              <ActivityDot />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--studio-text-primary)]">{item.summary}</p>
                <p className="mt-0.5 text-[10px] text-[var(--studio-text-tertiary)]">
                  {new Date(item.occurredAt).toLocaleString()}
                </p>
              </div>
              {item.href ? (
                <Link href={item.href} className="shrink-0 text-xs text-[var(--studio-accent)] hover:underline">
                  View
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link href="/marketing/activity" className="mt-4 inline-block text-xs font-medium text-[var(--studio-accent)] hover:underline">
        Full activity log →
      </Link>
    </section>
  );
}

function ActivityDot() {
  return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--studio-accent)]" aria-hidden />;
}
