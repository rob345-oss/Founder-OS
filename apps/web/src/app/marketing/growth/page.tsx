"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingOverview } from "@/lib/marketing/client-api";
import type { MarketingOverviewResponse } from "@/lib/marketing/types";

export default function MarketingGrowthPage() {
  const { token } = useMarketingSession();
  const [data, setData] = useState<MarketingOverviewResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchMarketingOverview(token, { preset: "30d" }).then(setData);
  }, [token]);

  return (
    <MarketingModuleScaffold
      eyebrow="Growth"
      title="Growth & conversion intelligence"
      description="Observed CRM conversions and attributed marketing outcomes. Billing-grade attribution is labeled separately when unavailable."
    >
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <GrowthStat label="Waitlist (30d)" metric={data.kpis.waitlistSignups} />
          <GrowthStat label="Qualified leads (30d)" metric={data.kpis.leadsGenerated} />
          <GrowthStat label="CRM customers (30d)" metric={data.kpis.marketingCustomerConversion} />
          <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 text-sm text-[var(--studio-text-secondary)]">
            <p className="font-medium text-[var(--studio-text-primary)]">Attribution note</p>
            <p className="mt-2 leading-relaxed">
              Customer counts reflect CRM <code className="text-[var(--studio-text-primary)]">converted</code> pipeline stages,
              not Stripe invoicing. Campaign-level attribution ships with Campaigns + analytics integrations.
            </p>
            <Link href="/marketing/campaigns" className="mt-3 inline-block text-[var(--studio-accent)] hover:underline">
              Manage campaigns →
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--studio-text-secondary)]">Loading growth metrics…</p>
      )}
    </MarketingModuleScaffold>
  );
}

function GrowthStat({ label, metric }: { label: string; metric: MarketingOverviewResponse["kpis"]["waitlistSignups"] }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--studio-text-tertiary)]">{label}</p>
      {metric.status === "live" ? (
        <p className="mt-2 text-2xl font-semibold text-[var(--studio-text-primary)]">{metric.value}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--studio-text-secondary)]">{metric.message}</p>
      )}
    </div>
  );
}
