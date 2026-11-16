"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { MetricCard } from "@/components/crm/MetricCard";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmDashboard, syncCrmWaitlist } from "@/lib/crm/client-api";
import type { CrmDashboardMetrics } from "@/lib/crm/types";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New lead",
  contacted: "Contacted",
  interested: "Interested",
  qualified: "Qualified",
  pilot_candidate: "Pilot candidate",
  pilot_active: "Pilot active",
  converted: "Converted",
  closed: "Closed",
};

export default function CrmOverviewPage() {
  const { token } = useCrmSession();
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (sync = false) => {
      if (!token) return;
      setError(null);
      try {
        const data = await fetchCrmDashboard(token, sync);
        setMetrics(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    },
    [token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  async function onSync() {
    if (!token) return;
    setSyncing(true);
    try {
      await syncCrmWaitlist(token);
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-text-tertiary)]">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">
            Relationship command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--studio-text-secondary)]">
            Live counts from the CRM store, synchronized with authoritative Titanium Guardian waitlist leads.
          </p>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void onSync()}
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm font-medium text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-hover)] disabled:opacity-60"
        >
          {syncing ? "Syncing waitlist…" : "Sync waitlist"}
        </button>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total contacts" value={metrics?.totalContacts ?? "—"} />
        <MetricCard label="Waitlist" value={metrics?.activeWaitlist ?? "—"} />
        <MetricCard label="Active prospects" value={metrics?.activeProspects ?? "—"} />
        <MetricCard label="Pilot candidates" value={metrics?.pilotCandidates ?? "—"} />
        <MetricCard label="Customers" value={metrics?.activeCustomers ?? "—"} />
        <MetricCard label="Follow-ups due" value={metrics?.followUpsDue ?? "—"} />
        <MetricCard label="Emails (30d)" value={metrics?.emailsSentLast30Days ?? "—"} hint="From CRM email log" />
        <MetricCard
          label="Follow-up queue"
          value={metrics ? `${metrics.followUpBuckets.overdue} overdue` : "—"}
          hint={
            metrics
              ? `${metrics.followUpBuckets.dueToday} today · ${metrics.followUpBuckets.dueThisWeek} this week`
              : undefined
          }
        />
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Pipeline</h2>
            <Link href="/crm/pipeline" className="text-xs text-[var(--studio-accent)] hover:underline">
              Open board
            </Link>
          </div>
          <ul className="space-y-2">
            {(metrics?.pipeline ?? []).map((row) => (
              <li key={row.stage} className="flex items-center gap-3 text-sm">
                <span className="w-36 text-[var(--studio-text-secondary)]">{STAGE_LABELS[row.stage] ?? row.stage}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--studio-bg-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--studio-accent)]"
                    style={{ width: `${Math.min(100, row.count * 8)}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-[var(--studio-text-primary)]">{row.count}</span>
              </li>
            ))}
            {!metrics?.pipeline?.length && (
              <li className="text-sm text-[var(--studio-text-tertiary)]">No pipeline data yet — sync waitlist or add contacts.</li>
            )}
          </ul>
        </div>

        <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--studio-text-primary)]">Recent activity</h2>
          <ul className="space-y-3">
            {(metrics?.recentActivity ?? []).map((a) => (
              <li key={a.id} className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2">
                <p className="text-xs font-medium text-[var(--studio-text-primary)]">{a.eventType.replaceAll("_", " ")}</p>
                <p className="mt-0.5 text-[11px] text-[var(--studio-text-tertiary)]">
                  {new Date(a.occurredAt).toLocaleString()} · {a.source}
                </p>
              </li>
            ))}
            {!metrics?.recentActivity?.length && (
              <li className="text-sm text-[var(--studio-text-tertiary)]">Activity will appear after sync and updates.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
