"use client";

import { useEffect, useState } from "react";

import { MarketingIntegrationCard } from "@/components/marketing/MarketingIntegrationCard";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingIntegrations } from "@/lib/marketing/client-api";
import type { MarketingIntegrationStatus } from "@/lib/marketing/types";

export default function MarketingIntegrationsPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<MarketingIntegrationStatus[]>([]);

  useEffect(() => {
    if (!token) return;
    void fetchMarketingIntegrations(token).then(setItems);
  }, [token]);

  return (
    <MarketingModuleScaffold
      eyebrow="System"
      title="Integrations hub"
      description="Connection truth — we never mark an integration connected without a verified server-side check."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <MarketingIntegrationCard key={item.id} item={item} />
        ))}
      </div>
    </MarketingModuleScaffold>
  );
}
