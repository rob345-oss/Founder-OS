"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import {
  cancelCampaignApi,
  fetchCampaignAnalytics,
  fetchEmailCampaign,
  scheduleCampaignApi,
} from "@/lib/crm/email-client-api";
import type { CrmEmailCampaign, CrmEmailCampaignAnalytics } from "@/lib/crm/email/types";

export default function CampaignDetailPage() {
  const { token } = useCrmSession();
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CrmEmailCampaign | null>(null);
  const [analytics, setAnalytics] = useState<CrmEmailCampaignAnalytics | null>(null);
  const [reschedule, setReschedule] = useState("");

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    setCampaign(await fetchEmailCampaign(token, params.id));
    setAnalytics(await fetchCampaignAnalytics(token, params.id));
  }, [token, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!campaign) return <p className="text-sm text-[var(--studio-text-secondary)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--studio-text-tertiary)]">Campaign</p>
        <h2 className="text-xl font-semibold">{campaign.name}</h2>
        <p className="mt-1 text-sm capitalize text-[var(--studio-text-secondary)]">{campaign.status.replaceAll("_", " ")}</p>
      </header>

      {analytics && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Sent" value={analytics.sent} />
          <Metric label="Delivered" value={analytics.delivered} />
          <Metric label="Unique opens" value={analytics.uniqueOpens} hint={analytics.opensAreApproximate ? "Approximate" : undefined} />
          <Metric label="Unique clicks" value={analytics.uniqueClicks} />
        </section>
      )}

      <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <h3 className="text-sm font-semibold">Schedule & controls</h3>
        <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">
          {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : "Not scheduled"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={reschedule}
            onChange={(e) => setReschedule(e.target.value)}
            className="rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="rounded-md border border-[var(--studio-border)] px-3 py-2 text-xs"
            onClick={() => {
              if (!token || !reschedule) return;
              void scheduleCampaignApi(token, campaign.id, new Date(reschedule).toISOString()).then(load);
            }}
          >
            Reschedule
          </button>
          <button
            type="button"
            className="rounded-md border border-red-400/50 px-3 py-2 text-xs text-red-300"
            onClick={() => {
              if (!token) return;
              void cancelCampaignApi(token, campaign.id).then(load);
            }}
          >
            Cancel pending
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-4">
      <p className="text-[11px] uppercase text-[var(--studio-text-tertiary)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="text-[10px] text-[var(--studio-text-tertiary)]">{hint}</p>}
    </div>
  );
}