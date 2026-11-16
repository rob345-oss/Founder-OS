"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { crmBtnPrimary } from "@/components/crm/crmUi";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailCampaigns, fetchEmailOverview } from "@/lib/crm/email-client-api";
import type { CrmEmailCampaign, CrmEmailOverviewMetrics } from "@/lib/crm/email/types";

export default function CrmEmailOverviewPage() {
  const { token } = useCrmSession();
  const [metrics, setMetrics] = useState<CrmEmailOverviewMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CrmEmailCampaign[]>([]);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    if (!token) return;
    setMetrics(await fetchEmailOverview(token, days));
    const items = await fetchEmailCampaigns(token);
    setCampaigns(items.slice(0, 6));
  }, [token, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={[
                "rounded-full border px-3 py-1 text-xs",
                days === d ? "border-[var(--studio-accent)] text-[var(--studio-accent)]" : "border-[var(--studio-border)]",
              ].join(" ")}
            >
              {d} days
            </button>
          ))}
        </div>
        <Link
          href="/crm/email/campaigns/new"
          className={crmBtnPrimary}
        >
          New campaign
        </Link>
      </div>

      {metrics && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Emails sent" value={String(metrics.emailsSent)} />
          <Kpi title="Delivery rate" value={formatRate(metrics.deliveryRate)} hint="Provider-confirmed deliveries" />
          <Kpi title="Open rate" value={formatRate(metrics.openRateApprox)} hint="Approximate — privacy/proxy limits" />
          <Kpi title="Click rate" value={formatRate(metrics.clickRate)} />
          <Kpi title="Unsubscribe rate" value={formatRate(metrics.unsubscribeRate)} />
          <Kpi title="Scheduled" value={String(metrics.scheduledCount)} />
          <Kpi title="Active automations" value={String(metrics.activeAutomations)} />
        </section>
      )}

      <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Recent campaigns</h2>
          <Link href="/crm/email/campaigns" className="text-xs text-[var(--studio-accent)]">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase text-[var(--studio-text-tertiary)]">
              <tr>
                <th className="pb-2 pr-4">Campaign</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Recipients</th>
                <th className="pb-2">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-[var(--studio-border)]">
                  <td className="py-2 pr-4">
                    <Link href={`/crm/email/campaigns/${c.id}`} className="font-medium text-[var(--studio-text-primary)] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 capitalize text-[var(--studio-text-secondary)]">{c.status.replaceAll("_", " ")}</td>
                  <td className="py-2 pr-4 text-[var(--studio-text-secondary)]">{c.estimatedRecipients ?? "—"}</td>
                  <td className="py-2 text-[var(--studio-text-tertiary)]">
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns.length && (
            <p className="py-8 text-center text-sm text-[var(--studio-text-tertiary)]">
              No campaigns yet. Create a template, then launch your first message.
            </p>
          )}
        </div>
      </section>

      <p className="text-xs text-[var(--studio-text-tertiary)]">
        Legacy provider log: <Link href="/crm/emails" className="text-[var(--studio-accent)]">Message history</Link>
      </p>
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--studio-text-primary)]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--studio-text-tertiary)]">{hint}</p>}
    </div>
  );
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}
