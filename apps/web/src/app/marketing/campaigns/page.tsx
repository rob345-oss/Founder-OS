"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { createMarketingCampaign, fetchMarketingCampaigns } from "@/lib/marketing/client-api";
import type { MarketingCampaign } from "@/lib/marketing/types";

export default function MarketingCampaignsPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<MarketingCampaign[]>([]);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await fetchMarketingCampaigns(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    await createMarketingCampaign(token, { name: name.trim(), status: "draft" });
    setName("");
    await load();
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Growth"
      title="Campaign manager"
      description="Track initiatives, channels, budgets, and results. Spend fields stay empty until finance integrations exist."
    >
      <form onSubmit={(e) => void onCreate(e)} className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campaign name"
          className="min-w-[240px] flex-1 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-accent-muted)] px-4 py-2 text-sm font-medium">
          Create campaign
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3 text-sm">
            <p className="font-medium text-[var(--studio-text-primary)]">{c.name}</p>
            <p className="text-xs text-[var(--studio-text-tertiary)]">
              {c.status} · {c.channel ?? "channel TBD"}
            </p>
          </li>
        ))}
      </ul>
    </MarketingModuleScaffold>
  );
}
