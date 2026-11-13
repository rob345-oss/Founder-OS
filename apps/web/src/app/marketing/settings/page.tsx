"use client";

import { useEffect, useState } from "react";

import { MarketingIntegrationCard } from "@/components/marketing/MarketingIntegrationCard";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingSettings, type MarketingSettingsPayload } from "@/lib/marketing/client-api";
import type { MarketingIntegrationStatus } from "@/lib/marketing/types";

export default function MarketingSettingsPage() {
  const { token } = useMarketingSession();
  const [data, setData] = useState<MarketingSettingsPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchMarketingSettings(token).then(setData);
  }, [token]);

  return (
    <MarketingModuleScaffold
      eyebrow="System"
      title="Command center settings"
      description="Dashboard preferences, metric definitions, and integration health for super_admin operators."
    >
      {!data ? (
        <p className="text-sm text-[var(--studio-text-secondary)]">Loading settings…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Setting label="Default date range" value={data.defaultDateRange} />
            <Setting label="Business timezone" value={data.timezone} />
            <Setting label="Qualified lead stages" value={data.qualifiedLeadStages.join(", ")} />
            <Setting
              label="Integration health"
              value={`${data.integrationHealth.connected} / ${data.integrationHealth.total} connected`}
            />
          </div>
          <FallbackSection integrations={data.integrations} />
        </div>
      )}
    </MarketingModuleScaffold>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--studio-text-tertiary)]">{label}</p>
      <p className="mt-2 text-sm text-[var(--studio-text-primary)]">{value}</p>
    </div>
  );
}

function FallbackSection({ integrations }: { integrations: MarketingIntegrationStatus[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Integration health summary</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {integrations.map((i) => (
          <MarketingIntegrationCard key={i.id} item={i} />
        ))}
      </div>
    </div>
  );
}
