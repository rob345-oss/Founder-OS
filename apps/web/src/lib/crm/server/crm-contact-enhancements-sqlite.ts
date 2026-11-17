import type Database from "better-sqlite3";

export function ensureCrmContactEnhancementsSchema(db: Database.Database): void {
  const noteCols = db.prepare("PRAGMA table_info(crm_notes)").all() as { name: string }[];
  const names = new Set(noteCols.map((c) => c.name));
  if (!names.has("category")) {
    db.exec(`ALTER TABLE crm_notes ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`);
  }
  if (!names.has("pinned")) {
    db.exec(`ALTER TABLE crm_notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`);
  }

  db.exec(`
CREATE TABLE IF NOT EXISTS crm_custom_field_definitions (
  id TEXT PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]',
  required INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_custom_field_definitions_key ON crm_custom_field_definitions (field_key);
`);
}