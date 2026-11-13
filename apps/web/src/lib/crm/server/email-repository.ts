import { normalizeEmail } from "../normalize";
import { getCrmDriver, getCrmSqlite, newId, nowIso, withPgClient } from "./db";

export type ProviderEmailEvent = {
  provider: string;
  providerMessageId: string;
  toAddress: string;
  fromAddress?: string;
  subject?: string;
  deliveryStatus: string;
  sentAt?: string;
  templateKey?: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
};

async function findContactIdByEmail(email: string): Promise<string | null> {
  const norm = normalizeEmail(email);
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(
        `SELECT id FROM crm_contacts WHERE primary_email_normalized = $1 AND archived_at IS NULL LIMIT 1`,
        [norm],
      )) as { id: string }[];
      return rows[0]?.id ?? null;
    });
  }
  const row = getCrmSqlite()
    .prepare(`SELECT id FROM crm_contacts WHERE primary_email_normalized = ? AND archived_at IS NULL LIMIT 1`)
    .get(norm) as { id: string } | undefined;
  return row?.id ?? null;
}

async function webhookAlreadySeen(provider: string, idempotencyKey: string): Promise<boolean> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(
        `SELECT id FROM crm_webhook_receipts WHERE provider = $1 AND idempotency_key = $2`,
        [provider, idempotencyKey],
      )) as { id: string }[];
      return Boolean(rows[0]);
    });
  }
  const row = getCrmSqlite()
    .prepare(`SELECT id FROM crm_webhook_receipts WHERE provider = ? AND idempotency_key = ?`)
    .get(provider, idempotencyKey) as { id: string } | undefined;
  return Boolean(row);
}

async function recordWebhookReceipt(provider: string, idempotencyKey: string, payload: Record<string, unknown>): Promise<void> {
  const id = newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_webhook_receipts (id, provider, idempotency_key, payload, received_at)
         VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT (provider, idempotency_key) DO NOTHING`,
        [id, provider, idempotencyKey, JSON.stringify(payload), ts],
      );
    });
    return;
  }
  getCrmSqlite()
    .prepare(
      `INSERT OR IGNORE INTO crm_webhook_receipts (id, provider, idempotency_key, payload, received_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, provider, idempotencyKey, JSON.stringify(payload), ts);
}

export async function ingestEmailProviderEvents(events: ProviderEmailEvent[]): Promise<{ ingested: number; skipped: number }> {
  let ingested = 0;
  let skipped = 0;
  for (const ev of events) {
    if (await webhookAlreadySeen(ev.provider, ev.idempotencyKey)) {
      skipped += 1;
      continue;
    }
    const contactId = await findContactIdByEmail(ev.toAddress);
    const ts = nowIso();
    const msgId = newId();
    if (getCrmDriver() === "postgres") {
      await withPgClient(async (q) => {
        await q(
          `INSERT INTO crm_email_messages (
            id, contact_id, provider, provider_message_id, to_address, from_address, subject,
            delivery_status, sent_at, metadata, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
          ON CONFLICT (provider, provider_message_id) WHERE provider_message_id IS NOT NULL
          DO UPDATE SET delivery_status = EXCLUDED.delivery_status, sent_at = COALESCE(EXCLUDED.sent_at, crm_email_messages.sent_at),
            metadata = crm_email_messages.metadata || EXCLUDED.metadata::jsonb`,
          [
            msgId,
            contactId,
            ev.provider,
            ev.providerMessageId,
            ev.toAddress,
            ev.fromAddress ?? null,
            ev.subject ?? null,
            ev.deliveryStatus,
            ev.sentAt ?? ts,
            JSON.stringify(ev.metadata),
            ts,
          ],
        );
        if (contactId) {
          await q(
            `INSERT INTO crm_activities (id, contact_id, event_type, source, idempotency_key, payload, occurred_at, created_at)
             VALUES ($1,$2,'email_delivery_updated','email_webhook',$3,$4::jsonb,$5,$5)
             ON CONFLICT (contact_id, idempotency_key) DO NOTHING`,
            [newId(), contactId, `email:${ev.idempotencyKey}`, JSON.stringify({ status: ev.deliveryStatus }), ev.sentAt ?? ts],
          );
        }
      });
    } else {
      const db = getCrmSqlite();
      const existing = db
        .prepare(`SELECT id FROM crm_email_messages WHERE provider = ? AND provider_message_id = ?`)
        .get(ev.provider, ev.providerMessageId) as { id: string } | undefined;
      if (existing) {
        db.prepare(
          `UPDATE crm_email_messages SET delivery_status = ?, sent_at = COALESCE(?, sent_at), metadata = ? WHERE id = ?`,
        ).run(ev.deliveryStatus, ev.sentAt ?? null, JSON.stringify(ev.metadata), existing.id);
      } else {
        db.prepare(
          `INSERT INTO crm_email_messages (id, contact_id, provider, provider_message_id, direction, to_address, from_address, subject,
            delivery_status, sent_at, metadata, created_at)
           VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          msgId,
          contactId,
          ev.provider,
          ev.providerMessageId,
          ev.toAddress,
          ev.fromAddress ?? null,
          ev.subject ?? null,
          ev.deliveryStatus,
          ev.sentAt ?? ts,
          JSON.stringify(ev.metadata),
          ts,
        );
      }
    }
    await recordWebhookReceipt(ev.provider, ev.idempotencyKey, ev.metadata);
    ingested += 1;
  }
  return { ingested, skipped };
}
