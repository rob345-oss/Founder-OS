import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { getCrmConfig } from "../config";
import { ensureCrmDataDir } from "./data-dir";

export type CrmDbDriver = "sqlite" | "postgres";

let sqliteInstance: Database.Database | null = null;

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  tg_lead_id TEXT UNIQUE,
  archived_at TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  primary_email TEXT NOT NULL,
  primary_email_normalized TEXT NOT NULL,
  additional_emails TEXT NOT NULL DEFAULT '[]',
  phone TEXT,
  country_code TEXT,
  preferred_language TEXT,
  organization TEXT,
  contact_source TEXT,
  classifications TEXT NOT NULL DEFAULT '[]',
  relationship_status TEXT NOT NULL DEFAULT 'new',
  pipeline_stage TEXT NOT NULL DEFAULT 'new_lead',
  assigned_owner_id TEXT,
  contact_preferences TEXT NOT NULL DEFAULT '{}',
  tags TEXT NOT NULL DEFAULT '[]',
  marketing_consent INTEGER,
  next_follow_up_at TEXT,
  last_interaction_at TEXT,
  date_added TEXT NOT NULL,
  waitlist_snapshot TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email_norm
  ON crm_contacts (primary_email_normalized)
  WHERE archived_at IS NULL AND tg_lead_id IS NULL;

CREATE TABLE IF NOT EXISTS crm_notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_note_revisions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES crm_notes(id) ON DELETE CASCADE,
  editor_user_id TEXT NOT NULL,
  previous_body TEXT NOT NULL,
  revised_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'crm',
  idempotency_key TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (contact_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS crm_follow_ups (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_owner_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_email_messages (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'twilio_sendgrid',
  provider_message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_address TEXT,
  to_address TEXT NOT NULL,
  subject TEXT,
  template_key TEXT,
  campaign_key TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'draft',
  sent_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_email_provider_id
  ON crm_email_messages (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_sync_runs (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL DEFAULT 'waitlist_leads',
  status TEXT NOT NULL,
  leads_seen INTEGER NOT NULL DEFAULT 0,
  upserted INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS crm_sync_state (
  sync_key TEXT PRIMARY KEY,
  last_success_at TEXT,
  last_watermark TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_webhook_receipts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  received_at TEXT NOT NULL,
  UNIQUE (provider, idempotency_key)
);
`;

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getCrmDriver(): CrmDbDriver {
  return getCrmConfig().databaseUrl ? "postgres" : "sqlite";
}

export function getCrmSqlite(): Database.Database {
  if (sqliteInstance) return sqliteInstance;
  const dir = ensureCrmDataDir();
  const dbPath = path.join(dir, "crm.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
  sqliteInstance = db;
  return db;
}

export function closeCrmSqlite(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}

export function resetCrmSqliteForTests(dbPath: string): Database.Database {
  closeCrmSqlite();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
  sqliteInstance = db;
  return db;
}

function toPgUrl(raw: string): string {
  return raw.replace(/^postgresql\+asyncpg:/, "postgresql:").replace(/^postgres\+asyncpg:/, "postgres:");
}

export async function withPgClient<T>(fn: (query: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>): Promise<T> {
  const url = getCrmConfig().databaseUrl;
  if (!url) throw new Error("CRM_DATABASE_URL not configured");
  const { Client } = await import("pg");
  const client = new Client({ connectionString: toPgUrl(url), connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    await client.query("SET search_path TO founder_os, public");
    const query = async (sql: string, params?: unknown[]) => {
      const result = await client.query(sql, params);
      return result.rows as unknown[];
    };
    return await fn(query);
  } finally {
    await client.end();
  }
}
