import { getCrmDriver, getCrmSqlite, newId, nowIso, withPgClient } from "./db";

export async function recordSyncRunStart(syncType: string): Promise<string> {
  const id = newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_sync_runs (id, sync_type, status, started_at) VALUES ($1, $2, 'started', $3)`,
        [id, syncType, ts],
      );
    });
    return id;
  }
  getCrmSqlite()
    .prepare(
      `INSERT INTO crm_sync_runs (id, sync_type, status, leads_seen, upserted, created, started_at) VALUES (?, ?, 'started', 0, 0, 0, ?)`,
    )
    .run(id, syncType, ts);
  return id;
}

export async function recordSyncRunSuccess(
  runId: string,
  stats: { leadsSeen: number; upserted: number; created: number; watermark: string | null },
): Promise<void> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `UPDATE crm_sync_runs SET status = 'succeeded', leads_seen = $2, upserted = $3, created = $4, finished_at = $5 WHERE id = $1`,
        [runId, stats.leadsSeen, stats.upserted, stats.created, ts],
      );
      await q(
        `INSERT INTO crm_sync_state (sync_key, last_success_at, last_watermark, updated_at)
         VALUES ('waitlist_leads', $1, $2, $1)
         ON CONFLICT (sync_key) DO UPDATE SET last_success_at = EXCLUDED.last_success_at,
           last_watermark = EXCLUDED.last_watermark, updated_at = EXCLUDED.updated_at`,
        [ts, stats.watermark],
      );
    });
    return;
  }
  const db = getCrmSqlite();
  db.prepare(
    `UPDATE crm_sync_runs SET status = 'succeeded', leads_seen = ?, upserted = ?, created = ?, finished_at = ? WHERE id = ?`,
  ).run(stats.leadsSeen, stats.upserted, stats.created, ts, runId);
  db.prepare(
    `INSERT INTO crm_sync_state (sync_key, last_success_at, last_watermark, metadata, updated_at)
     VALUES ('waitlist_leads', ?, ?, '{}', ?)
     ON CONFLICT(sync_key) DO UPDATE SET last_success_at = excluded.last_success_at,
       last_watermark = excluded.last_watermark, updated_at = excluded.updated_at`,
  ).run(ts, stats.watermark, ts);
}

export async function recordSyncRunFailure(runId: string, errorMessage: string): Promise<void> {
  await finishSyncRun(runId, "failed", { errorMessage });
}

export async function finishSyncRun(
  runId: string,
  status: "succeeded" | "failed",
  extra?: { errorMessage?: string; leadsSeen?: number; upserted?: number; created?: number },
): Promise<void> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `UPDATE crm_sync_runs SET status = $2, error_message = $3, leads_seen = COALESCE($4, leads_seen),
         upserted = COALESCE($5, upserted), created = COALESCE($6, created), finished_at = $7 WHERE id = $1`,
        [runId, status, extra?.errorMessage ?? null, extra?.leadsSeen ?? null, extra?.upserted ?? null, extra?.created ?? null, ts],
      );
    });
    return;
  }
  getCrmSqlite()
    .prepare(
      `UPDATE crm_sync_runs SET status = ?, error_message = ?, finished_at = ? WHERE id = ?`,
    )
    .run(status, extra?.errorMessage ?? null, ts, runId);
}
