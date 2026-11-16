"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCampaignAnalytics, fetchEmailCampaigns } from "@/lib/crm/email-client-api";
import type { CrmEmailCampaign, CrmEmailCampaignAnalytics } from "@/lib/crm/email/types";

export default function EmailAnalyticsPage() {
  const { token } = useCrmSession();
  const [campaigns, setCampaigns] = useState<CrmEmailCampaign[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [analytics, setAnalytics] = useState<CrmEmailCampaignAnalytics | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchEmailCampaigns(token).then(setCampaigns);
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    if (!token || !selected) return;
    setAnalytics(await fetchCampaignAnalytics(token, selected));
  }, [token, selected]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-4">
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm">
        <option value="">Select campaign</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {analytics && (
        <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 text-sm">
          <p>Sent: {analytics.sent}</p>
          <p>Delivered: {analytics.delivered}</p>
          <p>Failed: {analytics.failed}</p>
          <p>Bounced: {analytics.bounced}</p>
          <p>
            Unique opens: {analytics.uniqueOpens} {analytics.opensAreApproximate && "(approximate)"}
          </p>
          <p>Unique clicks: {analytics.uniqueClicks}</p>
          <p>Unsubscribes: {analytics.unsubscribes}</p>
          <Link href={`/crm/email/campaigns/${analytics.campaignId}`} className="mt-3 inline-block text-[var(--studio-accent)]">
            Open campaign
          </Link>
        </div>
      )}
    </div>
  );
}