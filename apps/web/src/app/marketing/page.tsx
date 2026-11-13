"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketingAcquisitionFunnel } from "@/components/marketing/MarketingAcquisitionFunnel";
import { MarketingActivityFeed } from "@/components/marketing/MarketingActivityFeed";
import { MarketingDateRangePicker } from "@/components/marketing/MarketingDateRangePicker";
import { MarketingGrowthChart } from "@/components/marketing/MarketingGrowthChart";
import { MarketingKPICard } from "@/components/marketing/MarketingKPICard";
import { MarketingPriorityPanel } from "@/components/marketing/MarketingPriorityPanel";
import { MarketingTopContent } from "@/components/marketing/MarketingTopContent";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingOverview } from "@/lib/marketing/client-api";
import type { MarketingDateRangePreset, MarketingOverviewResponse } from "@/lib/marketing/types";

export default function MarketingDashboardPage() {
  const { token } = useMarketingSession();
  const [preset, setPreset] = useState<MarketingDateRangePreset>("30d");
  const [data, setData] = useState<MarketingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchMarketingOverview(token, { preset });
      setData(overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="studio-subtle-grid min-h-full">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-6 md:px-6 md:pt-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--studio-border)] pb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--studio-text-tertiary)]">
              Titanium Guardian
            </p>
            <h1 className="mt-1 bg-gradient-to-r from-[#f5f5f7] via-[#c8d4ff] to-[#9ec5ff] bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
              Marketing Command Center
            </h1>
            <p className="mt-2 text-sm text-[var(--studio-text-secondary)]">Welcome back.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <MarketingDateRangePicker value={preset} onChange={setPreset} />
            <p className="text-[10px] text-[var(--studio-text-tertiary)]">
              {loading ? (
                "Refreshing…"
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-success)]" aria-hidden />
                    Live
                  </span>
                  {data ? ` · Last refresh ${new Date(data.refreshedAt).toLocaleString()}` : null}
                </>
              )}
            </p>
          </div>
        </header>

        {error ? (
          <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>
        ) : null}

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[var(--studio-radius-lg)] bg-[var(--studio-bg-2)]" />
            ))}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MarketingKPICard label="Website visitors" metric={data.kpis.websiteVisitors} href="/marketing/analytics" />
              <MarketingKPICard label="Waitlist signups" metric={data.kpis.waitlistSignups} href="/crm/waitlist" />
              <MarketingKPICard
                label="Visitor → waitlist"
                metric={data.kpis.visitorWaitlistConversion}
                href="/marketing/growth"
                suffix="%"
              />
              <MarketingKPICard label="Social reach" metric={data.kpis.socialReach} href="/marketing/social" />
              <MarketingKPICard label="Leads generated" metric={data.kpis.leadsGenerated} href="/crm/pipeline" />
              <MarketingKPICard
                label="Marketing → customer"
                metric={data.kpis.marketingCustomerConversion}
                href="/marketing/growth"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MarketingGrowthChart series={data.growth} insight={data.growthInsight} />
              </div>
              <MarketingPriorityPanel priorities={data.priorities} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <MarketingAcquisitionFunnel stages={data.funnel.stages} limitation={data.funnel.limitation} />
              <MarketingActivityFeed items={data.activity} />
            </div>

            <div className="mt-6">
              <MarketingTopContent rows={data.topContent} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
