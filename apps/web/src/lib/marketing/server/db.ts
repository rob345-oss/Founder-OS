import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { getCrmConfig } from "@/lib/crm/config";
import { ensureCrmDataDir } from "@/lib/crm/server/data-dir";
import { buildPgClientConnectionConfig } from "@/lib/crm/server/pg-connection";

import { getMarketingConfig } from "../config";

export type MarketingDbDriver = "sqlite" | "postgres";

let sqliteInstance: Database.Database | null = null;

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  channel TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  planned_budget REAL,
  actual_spend REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  target_value REAL NOT NULL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_content_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_type TEXT,
  platform TEXT,
  hook TEXT,
  cta TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  publish_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_date_range TEXT NOT NULL DEFAULT '30d',
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  qualified_lead_stages TEXT NOT NULL DEFAULT '[]',
  data_refresh_note TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  account_label TEXT,
  external_account_id TEXT,
  connection_state TEXT NOT NULL DEFAULT 'not_connected',
  capabilities TEXT NOT NULL DEFAULT '[]',
  last_sync_at TEXT,
  health_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_social_posts (
  id TEXT PRIMARY KEY,
  internal_label TEXT,
  body_text TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL,
  campaign_id TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  scheduled_at TEXT,
  published_at TEXT,
  platform_permalink TEXT,
  destination_url TEXT,
  cta_text TEXT,
  hashtags TEXT,
  topic_tags TEXT NOT NULL DEFAULT '[]',
  media_refs TEXT NOT NULL DEFAULT '[]',
  external_publish_state TEXT NOT NULL DEFAULT 'planned',
  publish_error TEXT,
  is_manual_track_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_social_post_metrics (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  source TEXT NOT NULL,
  provider_snapshot_id TEXT,
  period_start TEXT,
  period_end TEXT,
  impressions INTEGER,
  reach INTEGER,
  engagements INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  clicks INTEGER,
  video_views INTEGER,
  watch_time_sec INTEGER,
  profile_visits INTEGER,
  website_clicks INTEGER,
  followers_gained INTEGER,
  recorded_at TEXT NOT NULL,
  synced_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES marketing_social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketing_social_media_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  alt_text TEXT,
  asset_type TEXT NOT NULL,
  storage_url TEXT,
  storage_key TEXT,
  original_filename TEXT,
  mime_type TEXT,
  byte_size INTEGER,
  width INTEGER,
  height INTEGER,
  duration_sec INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  upload_state TEXT NOT NULL DEFAULT 'ready',
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_social_attribution_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  post_id TEXT,
  label TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_term TEXT,
  tracked_url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_social_audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
`;

function migrateMarketingSqliteMediaColumns(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info(marketing_social_media_assets)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  const add = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      /* column may exist */
    }
  };
  if (!names.has("description")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN description TEXT");
  if (!names.has("alt_text")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN alt_text TEXT");
  if (!names.has("storage_key")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN storage_key TEXT");
  if (!names.has("original_filename")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN original_filename TEXT");
  if (!names.has("upload_state")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN upload_state TEXT NOT NULL DEFAULT 'ready'");
  if (!names.has("archived_at")) add("ALTER TABLE marketing_social_media_assets ADD COLUMN archived_at TEXT");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getMarketingDriver(): MarketingDbDriver {
  return getMarketingConfig().databaseUrl ? "postgres" : "sqlite";
}

export function getMarketingSqlite(): Database.Database {
  if (sqliteInstance) return sqliteInstance;
  const dir = getMarketingConfig().dataDir ? path.resolve(getMarketingConfig().dataDir!) : ensureCrmDataDir();
  const dbPath = path.join(dir, "marketing_command_center.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
  migrateMarketingSqliteMediaColumns(db);
  const settings = db.prepare("SELECT id FROM marketing_settings WHERE id = 'default'").get();
  if (!settings) {
    db.prepare(
      `INSERT INTO marketing_settings (id, default_date_range, timezone, qualified_lead_stages, updated_at)
       VALUES ('default', '30d', ?, '["qualified","pilot_candidate","pilot_active","converted"]', ?)`,
    ).run(getMarketingConfig().timezone, nowIso());
  }
  sqliteInstance = db;
  return db;
}

export async function withMarketingPgClient<T>(
  fn: (query: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>,
): Promise<T> {
  const url = getMarketingConfig().databaseUrl ?? getCrmConfig().databaseUrl;
  if (!url) throw new Error("MARKETING_DATABASE_URL / CRM_DATABASE_URL not configured");
  const { Client } = await import("pg");
  const { connectionString, ssl } = buildPgClientConnectionConfig(url);
  const client = new Client({ connectionString, ssl, connectionTimeoutMillis: 8_000 });
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

export function closeMarketingSqliteForTests(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}

export function resetMarketingSqliteForTests(dbPath: string): Database.Database {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
  migrateMarketingSqliteMediaColumns(db);
  sqliteInstance = db;
  return db;
}
