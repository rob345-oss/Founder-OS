"use client";

import { useCallback, useEffect, useState } from "react";

import { AreaChart } from "@/components/marketing/AreaChart";
import { MarketingDateRangePicker } from "@/components/marketing/MarketingDateRangePicker";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { fetchSocialOverview } from "@/lib/marketing/client-api";
import type { MarketingDateRangePreset } from "@/lib/marketing/types";
import type { SocialOverviewResponse } from "@/lib/marketing/social-types";

export default function SocialAnalyticsPage() {
  const { token } = useMarketingSession();
  const [preset, setPreset] = useState<MarketingDateRangePreset>("30d");
  const [data, setData] = useState<SocialOverviewResponse | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setData(await fetchSocialOverview(token, { preset }));
  }, [token, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="Analytics"
      description="Cross-platform trends from recorded post metrics. Topic intelligence and cohort comparisons expand in M3."
    >
      <MarketingDateRangePicker value={preset} onChange={setPreset} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {data
          ? (Object.keys(data.series) as (keyof SocialOverviewResponse["series"])[]).map((key) => (
              <div key={key} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
                <h3 className="mb-2 text-sm font-medium capitalize text-[var(--studio-text-primary)]">{key.replace(/([A-Z])/g, " $1")}</h3>
                <AreaChart points={data.series[key]} label={key} />
              </div>
            ))
          : null}
      </div>
    </MarketingModuleScaffold>
  );
}