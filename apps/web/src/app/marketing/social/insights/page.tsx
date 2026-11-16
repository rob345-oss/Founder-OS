"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchSocialOverview, fetchSocialPosts } from "@/lib/marketing/client-api";

export default function SocialInsightsPage() {
  const { token } = useMarketingSession();
  const [insightText, setInsightText] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const [overview, posts] = await Promise.all([fetchSocialOverview(token, { preset: "30d" }), fetchSocialPosts(token)]);
      const published = posts.filter((p) => p.status === "published");
      if (!published.length) {
        setInsightText(null);
        return;
      }
      const top = overview.topPosts[0];
      const scheduled = overview.upcoming.length;
      setInsightText(
        `Observation: ${published.length} published posts in the workspace. ${
          top ? `Highest recorded impressions: “${top.preview.slice(0, 48)}…” on ${top.platform}.` : ""
        } ${scheduled ? `${scheduled} posts scheduled next.` : "No upcoming scheduled posts."} Recommendation: register metrics weekly for posts without API sync.`,
      );
    })();
  }, [token]);

  const body = useMemo(() => insightText, [insightText]);

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="AI insights"
      description="Evidence-based observations from your recorded analytics. LLM-assisted drafting ships in M4 — no fabricated performance claims."
    >
      {body ? (
        <p className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 text-sm leading-relaxed text-[var(--studio-text-secondary)]">
          {body}
        </p>
      ) : (
        <MarketingEmptyState
          title="Not enough data for insights"
          description="Publish posts and add manual metrics. Insights only reflect stored measurements."
        />
      )}
      <Link href="/marketing/social/create" className="mt-4 inline-block text-sm text-[var(--studio-accent)] hover:underline">
        Create draft from insight (M4) →
      </Link>
    </MarketingModuleScaffold>
  );
}