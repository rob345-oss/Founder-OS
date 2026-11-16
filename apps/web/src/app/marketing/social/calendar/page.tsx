"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchSocialPosts, updateSocialPostApi } from "@/lib/marketing/client-api";
import { SOCIAL_PLATFORM_LABELS, type SocialPostWithMetrics } from "@/lib/marketing/social-types";

export default function SocialCalendarPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<SocialPostWithMetrics[]>([]);
  const [view, setView] = useState<"month" | "week" | "list">("list");

  useEffect(() => {
    if (!token) return;
    void fetchSocialPosts(token).then(setItems);
  }, [token]);

  const scheduled = useMemo(
    () => items.filter((p) => p.scheduledAt && ["scheduled", "approved", "draft"].includes(p.status)),
    [items],
  );

  async function reschedule(id: string, scheduledAt: string) {
    if (!token) return;
    await updateSocialPostApi(token, id, { scheduledAt, status: "scheduled" });
    setItems(await fetchSocialPosts(token));
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="Content calendar"
      description="Drag-and-drop month grid ships in M2. Reschedule via datetime controls updates backend records with timezone-aware ISO timestamps."
    >
      <div className="mb-4 flex gap-2 text-sm">
        {(["month", "week", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={[
              "rounded-md border px-3 py-1 capitalize",
              view === v ? "border-[var(--studio-accent)] text-[var(--studio-text-primary)]" : "border-[var(--studio-border)] text-[var(--studio-text-tertiary)]",
            ].join(" ")}
          >
            {v}
          </button>
        ))}
      </div>
      {scheduled.length === 0 ? (
        <MarketingEmptyState
          title="Nothing scheduled"
          description="Schedule posts from Create Post. Calendar drag-and-drop arrives in the next milestone."
        />
      ) : (
        <ul className="space-y-3">
          {scheduled.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3">
              <div>
                <Link href={`/marketing/social/posts/${p.id}`} className="font-medium text-[var(--studio-text-primary)] hover:underline">
                  {p.internalLabel || p.bodyText.slice(0, 60)}
                </Link>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  {SOCIAL_PLATFORM_LABELS[p.platform]} · {p.status}
                </p>
              </div>
              <input
                type="datetime-local"
                defaultValue={p.scheduledAt?.slice(0, 16)}
                onBlur={(e) => {
                  if (e.target.value) void reschedule(p.id, new Date(e.target.value).toISOString());
                }}
                className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1 text-xs"
              />
            </li>
          ))}
        </ul>
      )}
    </MarketingModuleScaffold>
  );
}