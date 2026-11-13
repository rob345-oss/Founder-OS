"use client";

import { useEffect, useState } from "react";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingContent } from "@/lib/marketing/client-api";
import type { MarketingContentItem } from "@/lib/marketing/types";

export default function MarketingCalendarPage() {
  const { token } = useMarketingSession();
  const [scheduled, setScheduled] = useState<MarketingContentItem[]>([]);

  useEffect(() => {
    if (!token) return;
    void fetchMarketingContent(token).then((items) => {
      setScheduled(items.filter((c) => c.publishDate && c.status !== "published"));
    });
  }, [token]);

  return (
    <MarketingModuleScaffold
      eyebrow="Social & content"
      title="Content calendar"
      description="Planned publishing dates from Content Studio — manual scheduling only until platform APIs are connected."
    >
      {scheduled.length === 0 ? (
        <MarketingEmptyState
          title="No scheduled content"
          description="Set status to scheduled and choose a publish date in Content Studio."
        />
      ) : (
        <ul className="space-y-2">
          {scheduled.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3 text-sm"
            >
              <span className="font-medium text-[var(--studio-text-primary)]">{c.title}</span>
              <span className="text-[var(--studio-text-tertiary)]">
                {c.publishDate} · {c.platform ?? "—"} · {c.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </MarketingModuleScaffold>
  );
}
