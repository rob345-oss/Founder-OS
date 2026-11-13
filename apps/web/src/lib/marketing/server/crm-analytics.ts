import type Database from "better-sqlite3";

import { getCrmDriver, getCrmSqlite, withPgClient } from "@/lib/crm/server/db";

import { buildDailySeries, percentChange } from "../date-range";
import type { MarketingDateRange, MetricAvailability, SeriesPoint } from "../types";

const QUALIFIED_STAGES_SQL = `('qualified','pilot_candidate','pilot_active','converted')`;
const WAITLIST_FILTER = `archived_at IS NULL AND classifications::text LIKE '%waitlist_candidate%'`;
const WAITLIST_FILTER_SQLITE = `archived_at IS NULL AND classifications LIKE '%waitlist_candidate%'`;

async function countInRangePg(
  q: (sql: string, params?: unknown[]) => Promise<unknown[]>,
  sql: string,
  start: string,
  end: string,
): Promise<number> {
  const rows = (await q(sql, [start, end])) as { c: number }[];
  return rows[0]?.c ?? 0;
}

function countInRangeSqlite(db: Database.Database, sql: string, start: string, end: string): number {
  const row = db.prepare(sql).get(start, end) as { c: number };
  return row?.c ?? 0;
}

async function dailyBucketsPg(
  q: (sql: string, params?: unknown[]) => Promise<unknown[]>,
  sql: string,
  start: string,
  end: string,
): Promise<Map<string, number>> {
  const rows = (await q(sql, [start, end])) as { d: string; c: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = typeof r.d === "string" ? r.d.slice(0, 10) : String(r.d).slice(0, 10);
    map.set(key, Number(r.c));
  }
  return map;
}

function dailyBucketsSqlite(db: Database.Database, sql: string, start: string, end: string): Map<string, number> {
  const rows = db.prepare(sql).all(start, end) as { d: string; c: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.d.slice(0, 10), r.c);
  }
  return map;
}

function liveMetric(current: number, previous: number, series: SeriesPoint[]): MetricAvailability {
  return {
    status: "live",
    value: current,
    previousValue: previous,
    changePct: percentChange(current, previous),
    series,
  };
}

export type CrmPeriodCounts = {
  waitlistNew: MetricAvailability;
  qualifiedLeads: MetricAvailability;
  customersNew: MetricAvailability;
  totalQualifiedNow: number;
  totalCustomersNow: number;
  totalWaitlistNow: number;
};

export async function getCrmPeriodCounts(range: MarketingDateRange): Promise<CrmPeriodCounts> {
  const waitlistDailySqlPg = `
    SELECT date_trunc('day', date_added)::date::text AS d, COUNT(*)::int AS c
    FROM founder_os.crm_contacts
    WHERE ${WAITLIST_FILTER}
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz
    GROUP BY 1 ORDER BY 1`;

  const waitlistCountSqlPg = `
    SELECT COUNT(*)::int AS c FROM founder_os.crm_contacts
    WHERE ${WAITLIST_FILTER}
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz`;

  const qualifiedDailySqlPg = `
    SELECT date_trunc('day', date_added)::date::text AS d, COUNT(*)::int AS c
    FROM founder_os.crm_contacts
    WHERE archived_at IS NULL AND pipeline_stage IN ${QUALIFIED_STAGES_SQL}
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz
    GROUP BY 1 ORDER BY 1`;

  const qualifiedCountSqlPg = `
    SELECT COUNT(*)::int AS c FROM founder_os.crm_contacts
    WHERE archived_at IS NULL AND pipeline_stage IN ${QUALIFIED_STAGES_SQL}
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz`;

  const customerDailySqlPg = `
    SELECT date_trunc('day', date_added)::date::text AS d, COUNT(*)::int AS c
    FROM founder_os.crm_contacts
    WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz
    GROUP BY 1 ORDER BY 1`;

  const customerCountSqlPg = `
    SELECT COUNT(*)::int AS c FROM founder_os.crm_contacts
    WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')
      AND date_added >= $1::timestamptz AND date_added < $2::timestamptz`;

  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const [wCur, wPrev, qCur, qPrev, cCur, cPrev] = await Promise.all([
        countInRangePg(q, waitlistCountSqlPg, range.start, range.end),
        countInRangePg(q, waitlistCountSqlPg, range.previousStart, range.previousEnd),
        countInRangePg(q, qualifiedCountSqlPg, range.start, range.end),
        countInRangePg(q, qualifiedCountSqlPg, range.previousStart, range.previousEnd),
        countInRangePg(q, customerCountSqlPg, range.start, range.end),
        countInRangePg(q, customerCountSqlPg, range.previousStart, range.previousEnd),
      ]);

      const [wBuckets, qBuckets, cBuckets] = await Promise.all([
        dailyBucketsPg(q, waitlistDailySqlPg, range.start, range.end),
        dailyBucketsPg(q, qualifiedDailySqlPg, range.start, range.end),
        dailyBucketsPg(q, customerDailySqlPg, range.start, range.end),
      ]);

      const totals = (await q(
        `SELECT
          SUM(CASE WHEN ${WAITLIST_FILTER} THEN 1 ELSE 0 END)::int AS waitlist,
          SUM(CASE WHEN archived_at IS NULL AND pipeline_stage IN ${QUALIFIED_STAGES_SQL} THEN 1 ELSE 0 END)::int AS qualified,
          SUM(CASE WHEN archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted') THEN 1 ELSE 0 END)::int AS customers
        FROM founder_os.crm_contacts`,
      )) as { waitlist: number; qualified: number; customers: number }[];

      return {
        waitlistNew: liveMetric(wCur, wPrev, buildDailySeries(wBuckets, range.start, range.end)),
        qualifiedLeads: liveMetric(qCur, qPrev, buildDailySeries(qBuckets, range.start, range.end)),
        customersNew: liveMetric(cCur, cPrev, buildDailySeries(cBuckets, range.start, range.end)),
        totalQualifiedNow: totals[0]?.qualified ?? 0,
        totalCustomersNow: totals[0]?.customers ?? 0,
        totalWaitlistNow: totals[0]?.waitlist ?? 0,
      };
    });
  }

  const db = getCrmSqlite();
  const waitlistDailySqlite = `
    SELECT substr(date_added, 1, 10) AS d, COUNT(*) AS c FROM crm_contacts
    WHERE ${WAITLIST_FILTER_SQLITE}
      AND date_added >= ? AND date_added < ?
    GROUP BY d ORDER BY d`;
  const waitlistCountSqlite = `
    SELECT COUNT(*) AS c FROM crm_contacts
    WHERE ${WAITLIST_FILTER_SQLITE}
      AND date_added >= ? AND date_added < ?`;

  const qualifiedDailySqlite = `
    SELECT substr(date_added, 1, 10) AS d, COUNT(*) AS c FROM crm_contacts
    WHERE archived_at IS NULL AND pipeline_stage IN ('qualified','pilot_candidate','pilot_active','converted')
      AND date_added >= ? AND date_added < ?
    GROUP BY d ORDER BY d`;
  const qualifiedCountSqlite = `
    SELECT COUNT(*) AS c FROM crm_contacts
    WHERE archived_at IS NULL AND pipeline_stage IN ('qualified','pilot_candidate','pilot_active','converted')
      AND date_added >= ? AND date_added < ?`;

  const customerDailySqlite = `
    SELECT substr(date_added, 1, 10) AS d, COUNT(*) AS c FROM crm_contacts
    WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')
      AND date_added >= ? AND date_added < ?
    GROUP BY d ORDER BY d`;
  const customerCountSqlite = `
    SELECT COUNT(*) AS c FROM crm_contacts
    WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')
      AND date_added >= ? AND date_added < ?`;

  const wCur = countInRangeSqlite(db, waitlistCountSqlite, range.start, range.end);
  const wPrev = countInRangeSqlite(db, waitlistCountSqlite, range.previousStart, range.previousEnd);
  const qCur = countInRangeSqlite(db, qualifiedCountSqlite, range.start, range.end);
  const qPrev = countInRangeSqlite(db, qualifiedCountSqlite, range.previousStart, range.previousEnd);
  const cCur = countInRangeSqlite(db, customerCountSqlite, range.start, range.end);
  const cPrev = countInRangeSqlite(db, customerCountSqlite, range.previousStart, range.previousEnd);

  const wBuckets = dailyBucketsSqlite(db, waitlistDailySqlite, range.start, range.end);
  const qBuckets = dailyBucketsSqlite(db, qualifiedDailySqlite, range.start, range.end);
  const cBuckets = dailyBucketsSqlite(db, customerDailySqlite, range.start, range.end);

  const totals = db
    .prepare(
      `SELECT
        SUM(CASE WHEN ${WAITLIST_FILTER_SQLITE} THEN 1 ELSE 0 END) AS waitlist,
        SUM(CASE WHEN archived_at IS NULL AND pipeline_stage IN ('qualified','pilot_candidate','pilot_active','converted') THEN 1 ELSE 0 END) AS qualified,
        SUM(CASE WHEN archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted') THEN 1 ELSE 0 END) AS customers
      FROM crm_contacts`,
    )
    .get() as { waitlist: number; qualified: number; customers: number };

  return {
    waitlistNew: liveMetric(wCur, wPrev, buildDailySeries(wBuckets, range.start, range.end)),
    qualifiedLeads: liveMetric(qCur, qPrev, buildDailySeries(qBuckets, range.start, range.end)),
    customersNew: liveMetric(cCur, cPrev, buildDailySeries(cBuckets, range.start, range.end)),
    totalQualifiedNow: totals?.qualified ?? 0,
    totalCustomersNow: totals?.customers ?? 0,
    totalWaitlistNow: totals?.waitlist ?? 0,
  };
}

/** Qualified leads: pipeline_stage qualified+ excluding pure waitlist rows already counted separately. */
export async function countQualifiedLeadsDistinct(range: MarketingDateRange): Promise<MetricAvailability> {
  const counts = await getCrmPeriodCounts(range);
  if (counts.qualifiedLeads.status !== "live") return counts.qualifiedLeads;
  return {
    ...counts.qualifiedLeads,
    hint: "New contacts reaching qualified stage or beyond during the period (CRM date_added).",
  };
}
