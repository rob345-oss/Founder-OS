import { buildDailySeries, percentChange } from "../date-range";
import type { MetricAvailability, SeriesPoint } from "../types";

import { getCrmDriver, getCrmSqlite, withPgClient } from "@/lib/crm/server/db";

import { getMarketingDriver, withMarketingPgClient } from "./db";

type WaitlistAttribution = {
  status: "live" | "unconfigured";
  count: number;
  previousCount: number;
  series: SeriesPoint[];
  hint?: string;
  metric: MetricAvailability;
};

/**
 * Count waitlist contacts with utm_medium=social in the selected range (CRM source of truth).
 */
export async function loadSocialAttributedWaitlistCount(startIso: string, endIso: string): Promise<WaitlistAttribution> {
  const previousStart = new Date(startIso);
  const span = new Date(endIso).getTime() - previousStart.getTime();
  const prevStart = new Date(previousStart.getTime() - span).toISOString();
  const unconfigured: WaitlistAttribution = {
    status: "unconfigured",
    count: 0,
    previousCount: 0,
    series: [],
    hint: "CRM database required for UTM-attributed waitlist counts.",
    metric: { status: "unconfigured", message: "Connect CRM database to attribute social waitlist signups." },
  };

  try {
    if (getMarketingDriver() === "postgres" || getCrmDriver() === "postgres") {
      const run = getCrmDriver() === "postgres" ? withPgClient : withMarketingPgClient;
      return run(async (q) => {
        const hasContacts = await q(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'founder_os' AND table_name = 'crm_contacts' LIMIT 1`,
        );
        if (!hasContacts.length) return unconfigured;

        const socialUtm = `(
          LOWER(COALESCE(waitlist_snapshot->>'utm_medium', '')) = 'social'
          OR LOWER(COALESCE(waitlist_snapshot->>'utm_source', '')) IN
            ('linkedin','instagram','facebook','youtube','tiktok','twitter','x')
        )`;
        const waitlist = `archived_at IS NULL AND classifications::text LIKE '%waitlist_candidate%'`;

        const rows = (await q(
          `SELECT date_trunc('day', date_added)::date::text AS day, COUNT(*)::int AS c
           FROM crm_contacts
           WHERE ${waitlist} AND date_added >= $1::timestamptz AND date_added < $2::timestamptz
             AND ${socialUtm}
           GROUP BY 1 ORDER BY 1`,
          [startIso, endIso],
        )) as { day: string; c: number }[];

        const prevRow = (await q(
          `SELECT COUNT(*)::int AS c FROM crm_contacts
           WHERE ${waitlist} AND date_added >= $1::timestamptz AND date_added < $2::timestamptz
             AND ${socialUtm}`,
          [prevStart, startIso],
        )) as { c: number }[];

        const buckets = new Map<string, number>();
        let total = 0;
        for (const r of rows) {
          const key = String(r.day).slice(0, 10);
          buckets.set(key, r.c);
          total += r.c;
        }
        const prevTotal = prevRow[0]?.c ?? 0;
        const series = buildDailySeries(buckets, startIso, endIso);
        const metric: MetricAvailability = {
          status: "live",
          value: total,
          previousValue: prevTotal,
          changePct: percentChange(total, prevTotal),
          series,
          hint: "Attributed when UTM medium=social or known social utm_source on CRM contact.",
        };
        return {
          status: "live",
          count: total,
          previousCount: prevTotal,
          series,
          hint: metric.hint,
          metric,
        };
      });
    }

    const db = getCrmSqlite();
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='crm_contacts'").get();
    if (!table) return unconfigured;

    const rows = db
      .prepare(
        `SELECT substr(date_added, 1, 10) AS day, COUNT(*) AS c
         FROM crm_contacts
         WHERE archived_at IS NULL AND classifications LIKE '%waitlist_candidate%'
           AND date_added >= ? AND date_added < ?
           AND (
             LOWER(json_extract(waitlist_snapshot, '$.utm_medium')) = 'social'
             OR LOWER(json_extract(waitlist_snapshot, '$.utm_source')) IN
               ('linkedin','instagram','facebook','youtube','tiktok','twitter','x')
           )
         GROUP BY day ORDER BY day`,
      )
      .all(startIso, endIso) as { day: string; c: number }[];
    const prevTotal = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM crm_contacts
           WHERE archived_at IS NULL AND classifications LIKE '%waitlist_candidate%'
             AND date_added >= ? AND date_added < ?
             AND (
               LOWER(json_extract(waitlist_snapshot, '$.utm_medium')) = 'social'
               OR LOWER(json_extract(waitlist_snapshot, '$.utm_source')) IN
                 ('linkedin','instagram','facebook','youtube','tiktok','twitter','x')
             )`,
        )
        .get(prevStart, startIso) as { c: number }
    ).c;
    const buckets = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      buckets.set(r.day, r.c);
      total += r.c;
    }
    const series = buildDailySeries(buckets, startIso, endIso);
    const metric: MetricAvailability = {
      status: "live",
      value: total,
      previousValue: prevTotal,
      changePct: percentChange(total, prevTotal),
      series,
      hint: "Attributed when UTM medium=social or known social utm_source on CRM contact.",
    };
    return { status: "live", count: total, previousCount: prevTotal, series, hint: metric.hint, metric };
  } catch {
    return unconfigured;
  }
}