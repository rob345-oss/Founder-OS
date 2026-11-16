"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { MetricCard } from "@/components/crm/MetricCard";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmDashboard, runCrmWaitlistBackfill, syncCrmWaitlist } from "@/lib/crm/client-api";
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
  const [backfilling, setBackfilling] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState<string | null>(null);
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

  async function onBackfillDryRun() {
    if (!token) return;
    setBackfilling(true);
    setBackfillPreview(null);
    try {
      const result = await runCrmWaitlistBackfill(token, { dryRun: true });
      setBackfillPreview(
        `Dry run: ${result.examined} TG leads would be examined (${result.leadCount} fetched). No writes performed.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill preview failed");
    } finally {
      setBackfilling(false);
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={backfilling}
            onClick={() => void onBackfillDryRun()}
            className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm font-medium text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-hover)] disabled:opacity-60"
          >
            {backfilling ? "Previewing…" : "Waitlist backfill (dry run)"}
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void onSync()}
            className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm font-medium text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-hover)] disabled:opacity-60"
          >
            {syncing ? "Syncing waitlist…" : "Sync waitlist"}
          </button>
        </div>
      </header>

      {backfillPreview && (
        <p className="mb-4 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-3 text-sm text-[var(--studio-text-secondary)]">
          {backfillPreview}
        </p>
      )}

      {error && (
        <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total contacts" value={metrics?.totalContacts ?? "—"} />
        <MetricCard label="Total leads" value={metrics?.totalLeads ?? "—"} />
        <MetricCard label="New leads (7d)" value={metrics?.newLeadsThisWeek ?? "—"} />
        <MetricCard label="Waitlist leads" value={metrics?.waitlistLeads ?? "—"} />
        <MetricCard label="Qualified" value={metrics?.qualifiedLeads ?? "—"} />
        <MetricCard label="Active waitlist" value={metrics?.activeWaitlist ?? "—"} />
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
          <PipelineSectionHeading />
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

        <RecentContactsSection metrics={metrics} />
      </section>
    </div>
  );
}

function PipelineSectionHeading() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Pipeline</h2>
      <Link href="/crm/pipeline" className="text-xs text-[var(--studio-accent)] hover:underline">
        Open board
      </Link>
    </div>
  );
}

function RecentContactsSection({ metrics }: { metrics: CrmDashboardMetrics | null }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--studio-text-primary)]">Recent contacts</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="text-[var(--studio-text-tertiary)]">
              <th className="pb-2 pr-3 font-medium">Name</th>
              <th className="pb-2 pr-3 font-medium">Email</th>
              <th className="pb-2 pr-3 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.recentContacts ?? []).map((c) => (
              <tr key={c.id} className="border-t border-[var(--studio-border)]/50">
                <td className="py-2 pr-3">
                  <Link href={`/crm/contacts/${c.id}`} className="text-[var(--studio-text-primary)] hover:underline">
                    {c.fullName || "—"}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-[var(--studio-text-secondary)]">{c.primaryEmail}</td>
                <td className="py-2 text-[var(--studio-text-secondary)]">{c.pipelineStage.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!metrics?.recentContacts?.length && (
        <p className="text-sm text-[var(--studio-text-tertiary)]">Contacts will appear after create or sync.</p>
      )}

      <h3 className="mb-3 mt-6 text-sm font-semibold text-[var(--studio-text-primary)]">Recent activity</h3>
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
  );
}