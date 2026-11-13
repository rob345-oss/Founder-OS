"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { createMarketingGoal, fetchMarketingGoals } from "@/lib/marketing/client-api";
import type { MarketingGoal } from "@/lib/marketing/types";

export default function MarketingGoalsPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<MarketingGoal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("500");

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await fetchMarketingGoals(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    await createMarketingGoal(token, {
      title: title.trim(),
      metricKey: "waitlist_signups",
      targetValue: Number(target),
      status: "active",
    });
    setTitle("");
    await load();
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Operations"
      title="Goals & targets"
      description="Define measurable objectives. Progress metrics connect to live data sources as integrations mature."
    >
      <form onSubmit={(e) => void onCreate(e)} className="mb-6 grid gap-2 md:grid-cols-[1fr,120px,auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title"
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2 text-sm"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          type="number"
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-[var(--studio-accent-muted)] px-4 py-2 text-sm font-medium">
          Add goal
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((g) => (
          <li key={g.id} className="rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3 text-sm">
            <p className="font-medium text-[var(--studio-text-primary)]">{g.title}</p>
            <p className="text-xs text-[var(--studio-text-tertiary)]">
              Target {g.targetValue} ({g.metricKey}) · {g.status}
            </p>
          </li>
        ))}
      </ul>
    </MarketingModuleScaffold>
  );
}
