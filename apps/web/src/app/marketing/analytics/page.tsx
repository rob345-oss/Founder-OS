"use client";

import Link from "next/link";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";

export default function MarketingAnalyticsPage() {
  return (
    <MarketingModuleScaffold
      eyebrow="Overview"
      title="Website analytics"
      description="Sessions, sources, landing pages, and website-to-waitlist conversion — powered by your analytics provider when connected."
    >
      <MarketingEmptyState
        title="Connect analytics to activate this dashboard"
        description="No GA4 or alternative analytics read path is live yet. Configure credentials under Integrations, then return here for traffic trends."
        action={
          <Link
            href="/marketing/integrations"
            className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm text-[var(--studio-text-primary)]"
          >
            Open Integrations
          </Link>
        }
      />
    </MarketingModuleScaffold>
  );
}
