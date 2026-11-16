"use client";

import Link from "next/link";

import { SOCIAL_PLATFORM_LABELS } from "@/lib/marketing/social-types";
import { dateKeyFromIso, displayEventInstant, formatTimeHm } from "@/lib/marketing/social-calendar";
import type { SocialPostWithMetrics } from "@/lib/marketing/social-types";
import type { MarketingCampaign } from "@/lib/marketing/types";

import { PlatformMark, StatusPill, postTitle } from "./calendar-shared";

export function CalendarListView({
  posts,
  campaigns,
  timeZone,
  selectedId,
  onSelect,
}: {
  posts: SocialPostWithMetrics[];
  campaigns: MarketingCampaign[];
  timeZone: string;
  selectedId: string | null;
  onSelect: (p: SocialPostWithMetrics) => void;
}) {
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));
  const grouped = new Map<string, SocialPostWithMetrics[]>();
  const sorted = [...posts].sort((a, b) => {
    const ia = displayEventInstant(a) ?? a.createdAt;
    const ib = displayEventInstant(b) ?? b.createdAt;
    return ia.localeCompare(ib);
  });
  for (const p of sorted) {
    const instant = displayEventInstant(p) ?? p.createdAt;
    const key = dateKeyFromIso(instant, timeZone);
    const list = grouped.get(key) ?? [];
    list.push(p);
    grouped.set(key, list);
  }
  const keys = [...grouped.keys()].sort();

  if (!keys.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--studio-text-tertiary)]">Your content calendar starts here.</p>
    );
  }

  return (
    <div className="space-y-6">
      {keys.map((key) => (
        <section key={key}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-tertiary)]">{key}</h3>
          <ul className="divide-y divide-[var(--studio-border)] overflow-hidden rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)]">
            {(grouped.get(key) ?? []).map((p) => {
              const instant = displayEventInstant(p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className={[
                      "flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--studio-bg-1)]",
                      selectedId === p.id ? "bg-[var(--studio-bg-1)]" : "",
                    ].join(" ")}
                  >
                    <PlatformMark platform={p.platform} className="h-3 w-3" />
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-medium text-[var(--studio-text-primary)]">{postTitle(p)}</p>
                      <p className="text-xs text-[var(--studio-text-tertiary)]">{SOCIAL_PLATFORM_LABELS[p.platform]}</p>
                    </div>
                    <span className="text-xs text-[var(--studio-text-secondary)]">
                      {p.campaignId ? campaignMap.get(p.campaignId) ?? "Campaign" : "—"}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--studio-text-tertiary)]">
                      {instant ? formatTimeHm(instant, timeZone) : "—"}
                    </span>
                    <StatusPill status={p.status} />
                    <Link
                      href={`/marketing/social/posts/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-[var(--studio-accent)]"
                    >
                      Edit
                    </Link>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}