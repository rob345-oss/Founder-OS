import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { ensureCrmDataDir } from "@/lib/crm/server/data-dir";
import { withVerifiedPgClient } from "@/lib/crm/server/pg-client";

import { assertMarketingPersistenceForHost, getMarketingConfig } from "../config";

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
`;

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
  assertMarketingPersistenceForHost();
  if (sqliteInstance) return sqliteInstance;
  const dir = getMarketingConfig().dataDir ? path.resolve(getMarketingConfig().dataDir!) : ensureCrmDataDir();
  const dbPath = path.join(dir, "marketing_command_center.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
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
  const url = getMarketingConfig().databaseUrl;
  if (!url) throw new Error("MARKETING_DATABASE_URL / CRM_DATABASE_URL not configured");
  return withVerifiedPgClient(url, fn);
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
  sqliteInstance = db;
  return db;
}
