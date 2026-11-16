"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchSocialPosts } from "@/lib/marketing/client-api";
import { SOCIAL_PLATFORM_LABELS, type SocialPostWithMetrics } from "@/lib/marketing/social-types";

export default function SocialPostsPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<SocialPostWithMetrics[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetchSocialPosts(token, { q: q || undefined }).then(setItems);
  }, [token, q]);

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="All posts"
      description="Every tracked post — including manual registrations for content published outside Founder OS."
    >
      <p className="mb-4 text-sm">
        <Link href="/marketing/social/create" className="text-[var(--studio-accent)] hover:underline">
          Register or create a post →
        </Link>
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts…"
        className="mb-4 w-full max-w-md rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
      />
      {items.length === 0 ? (
        <MarketingEmptyState
          title="No posts yet"
          description="Create a draft or register a post you published manually, then add performance metrics."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)] text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
              <tr>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2">Impr.</th>
                <th className="px-3 py-2">ER%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-[var(--studio-border)]/50 hover:bg-[var(--studio-bg-2)]">
                  <td className="max-w-xs px-3 py-2">
                    <Link href={`/marketing/social/posts/${p.id}`} className="line-clamp-2 text-[var(--studio-text-primary)] hover:underline">
                      {p.internalLabel || p.bodyText || "(empty)"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{SOCIAL_PLATFORM_LABELS[p.platform]}</td>
                  <td className="px-3 py-2 capitalize text-[var(--studio-text-secondary)]">{p.status.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-[var(--studio-text-tertiary)]">{p.publishedAt?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2">{p.latestManualMetrics?.impressions ?? p.latestProviderMetrics?.impressions ?? "—"}</td>
                  <td className="px-3 py-2">{p.engagementRate != null ? p.engagementRate.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MarketingModuleScaffold>
  );
}