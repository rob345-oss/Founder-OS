"use client";

import { useEffect, useState } from "react";

import { MarketingActivityFeed } from "@/components/marketing/MarketingActivityFeed";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchMarketingOverview } from "@/lib/marketing/client-api";
import type { MarketingActivityItem } from "@/lib/marketing/types";

export default function MarketingActivityPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<MarketingActivityItem[]>([]);

  useEffect(() => {
    if (!token) return;
    void fetchMarketingOverview(token, { preset: "30d" }).then((d) => setItems(d.activity));
  }, [token]);

  return (
    <MarketingModuleScaffold
      eyebrow="Operations"
      title="Marketing activity log"
      description="Persisted CRM and marketing operations events with timestamps. PII is minimized in summaries."
    >
      <MarketingActivityFeed items={items} />
    </MarketingModuleScaffold>
  );
}
