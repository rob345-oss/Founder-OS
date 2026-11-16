import { normalizeEmail } from "../normalize";
import { getCrmDriver, getCrmSqlite, newId, nowIso, withPgClient } from "./db";

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const norm = normalizeEmail(email);
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(`SELECT id FROM crm_email_suppressions WHERE email_normalized = $1`, [norm])) as { id: string }[];
      return Boolean(rows[0]);
    });
  }
  const row = getCrmSqlite().prepare(`SELECT id FROM crm_email_suppressions WHERE email_normalized = ?`).get(norm);
  return Boolean(row);
}

export async function addEmailSuppression(email: string, reason: string, campaignId?: string): Promise<void> {
  const id = newId();
  const ts = nowIso();
  const norm = normalizeEmail(email);
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_email_suppressions (id, email_normalized, reason, source_campaign_id, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email_normalized) DO NOTHING`,
        [id, norm, reason, campaignId ?? null, ts],
      );
    });
    return;
  }
  getCrmSqlite()
    .prepare(
      `INSERT OR IGNORE INTO crm_email_suppressions (id, email_normalized, reason, source_campaign_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, norm, reason, campaignId ?? null, ts);
}