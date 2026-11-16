"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AreaChart } from "@/components/marketing/AreaChart";
import { MarketingDateRangePicker } from "@/components/marketing/MarketingDateRangePicker";
import { MarketingKPICard } from "@/components/marketing/MarketingKPICard";
import { SocialPublishBanner } from "@/components/marketing/social/SocialPublishBanner";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchSocialOverview } from "@/lib/marketing/client-api";
import type { MarketingDateRangePreset } from "@/lib/marketing/types";
import type { SocialOverviewResponse } from "@/lib/marketing/social-types";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/marketing/social-types";

const KPI_LABELS: { key: keyof SocialOverviewResponse["kpis"]; label: string; suffix?: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "engagementRate", label: "Engagement Rate", suffix: "%" },
  { key: "followerGrowth", label: "Followers Gained" },
  { key: "websiteClicks", label: "Website Clicks" },
  { key: "waitlistSignups", label: "Waitlist Conversions" },
  { key: "engagements", label: "Engagements" },
  { key: "profileVisits", label: "Profile Visits" },
  { key: "postsPublished", label: "Posts Published" },
  { key: "postsScheduled", label: "Scheduled Posts" },
];

export default function SocialCommandOverviewPage() {
  const { token } = useMarketingSession();
  const [preset, setPreset] = useState<MarketingDateRangePreset>("30d");
  const [data, setData] = useState<SocialOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<keyof SocialOverviewResponse["series"]>("impressions");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSocialOverview(token, { preset }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load social overview");
    } finally {
      setLoading(false);
    }
  }, [token, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartPoints = useMemo(() => data?.series[chartMetric] ?? [], [data, chartMetric]);

  return (
    <div className="studio-subtle-grid min-h-full">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-6 md:px-6 md:pt-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--studio-border)] pb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--studio-text-tertiary)]">
              Social command center
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">
              Organic social mission control
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--studio-text-secondary)]">
              Track real post performance, plan content, and attribute waitlist signups — without fabricated platform
              metrics.
            </p>
          </div>
          <MarketingDateRangePicker value={preset} onChange={setPreset} />
        </header>

        {data ? <SocialPublishBanner armed={data.publishArmed} /> : null}

        {error ? (
          <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KPI_LABELS.map(({ key, label, suffix }) => (
            <MarketingKPICard
              key={key}
              label={label}
              suffix={suffix}
              metric={
                loading && !data
                  ? { status: "insufficient_data", message: "Loading…" }
                  : (data?.kpis[key] ?? { status: "insufficient_data", message: "—" })
              }
              href={key === "postsPublished" ? "/marketing/social/posts" : undefined}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Performance trend</h2>
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as keyof SocialOverviewResponse["series"])}
                className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1 text-xs text-[var(--studio-text-secondary)]"
              >
                <option value="impressions">Impressions</option>
                <option value="reach">Reach</option>
                <option value="engagements">Engagements</option>
                <option value="followersGained">Followers gained</option>
                <option value="websiteClicks">Website clicks</option>
              </select>
            </div>
            <AreaChart points={chartPoints} label={chartMetric} />
          </section>

          <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Marketing funnel</h2>
            <ul className="mt-4 space-y-3">
              {(data?.funnel.stages ?? []).map((s) => (
                <li key={s.key} className="border-l-2 border-[var(--studio-accent)]/40 pl-3">
                  <p className="text-xs text-[var(--studio-text-tertiary)]">{s.label}</p>
                  <p className="text-lg font-semibold text-[var(--studio-text-primary)]">
                    {s.count == null ? "—" : s.count.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">{s.kind}</p>
                  {s.note ? <p className="mt-1 text-[10px] text-[var(--studio-text-tertiary)]">{s.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Platforms</h2>
            <ul className="mt-4 space-y-3">
              {(data?.platformSummaries ?? []).map((p) => (
                <li
                  key={p.platform}
                  className="flex items-start justify-between gap-2 rounded-md border border-[var(--studio-border)]/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--studio-text-primary)]">{p.label}</p>
                    <p className="text-[10px] capitalize text-[var(--studio-text-tertiary)]">{p.connectionState.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right text-xs text-[var(--studio-text-secondary)]">
                    <p>{p.postsPublished} posts</p>
                    <p>{p.impressions != null ? `${p.impressions.toLocaleString()} impr.` : "—"}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/marketing/integrations" className="mt-4 inline-block text-xs text-[var(--studio-accent)] hover:underline">
              Manage connections →
            </Link>
          </section>

          <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Top content</h2>
            {data?.topPosts.length ? (
              <ul className="mt-4 space-y-3">
                {data.topPosts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/marketing/social/posts/${p.id}`} className="block rounded-md border border-[var(--studio-border)]/60 px-3 py-2 hover:border-[var(--studio-border-strong)]">
                      <p className="text-[10px] text-[var(--studio-text-tertiary)]">
                        {SOCIAL_PLATFORM_LABELS[p.platform]}
                        {p.publishedAt ? ` · ${p.publishedAt.slice(0, 10)}` : ""}
                      </p>
                      <p className="line-clamp-2 text-sm text-[var(--studio-text-primary)]">{p.preview}</p>
                      <p className="mt-1 text-xs text-[var(--studio-text-secondary)]">
                        {p.impressions != null ? `${p.impressions.toLocaleString()} impressions` : "No metrics"}
                        {p.engagementRate != null ? ` · ${p.engagementRate.toFixed(1)}% ER` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--studio-text-tertiary)]">Publish and record metrics to rank posts.</p>
            )}
          </section>

          <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Upcoming</h2>
            {data?.upcoming.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {data.upcoming.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--studio-border)]/40 pb-2">
                    <span className="line-clamp-1 text-[var(--studio-text-primary)]">{p.internalLabel || p.bodyText.slice(0, 48)}</span>
                    <span className="shrink-0 text-xs text-[var(--studio-text-tertiary)]">{p.scheduledAt?.slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--studio-text-tertiary)]">No scheduled posts yet.</p>
            )}
            <Link href="/marketing/social/calendar" className="mt-4 inline-block text-xs text-[var(--studio-accent)] hover:underline">
              Open calendar →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}