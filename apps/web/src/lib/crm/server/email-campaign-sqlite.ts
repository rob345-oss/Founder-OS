import type Database from "better-sqlite3";

export const CRM_EMAIL_SQLITE_DDL = `
CREATE TABLE IF NOT EXISTS crm_email_labels (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5b8cff',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en',
  communication_type TEXT NOT NULL DEFAULT 'promotional',
  status TEXT NOT NULL DEFAULT 'draft',
  from_name TEXT NOT NULL DEFAULT 'Titanium Guardian',
  from_address TEXT,
  subject_default TEXT NOT NULL DEFAULT '',
  preview_text_default TEXT NOT NULL DEFAULT '',
  current_version_id TEXT,
  created_by_user_id TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES crm_email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  blocks TEXT NOT NULL DEFAULT '[]',
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  preview_text TEXT NOT NULL DEFAULT '',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (template_id, version_number)
);
CREATE TABLE IF NOT EXISTS crm_email_template_labels (
  template_id TEXT NOT NULL REFERENCES crm_email_templates(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES crm_email_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, label_id)
);
CREATE TABLE IF NOT EXISTS crm_email_segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  filter TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  communication_type TEXT NOT NULL DEFAULT 'promotional',
  template_id TEXT REFERENCES crm_email_templates(id) ON DELETE SET NULL,
  template_version_id TEXT,
  subject TEXT NOT NULL DEFAULT '',
  preview_text TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT 'Titanium Guardian',
  from_address TEXT,
  audience_filter TEXT NOT NULL DEFAULT '{}',
  excluded_contact_ids TEXT NOT NULL DEFAULT '[]',
  estimated_recipients INTEGER,
  scheduled_at TEXT,
  scheduled_timezone TEXT NOT NULL DEFAULT 'UTC',
  started_at TEXT,
  completed_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_campaign_labels (
  campaign_id TEXT NOT NULL REFERENCES crm_email_campaigns(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES crm_email_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, label_id)
);
CREATE TABLE IF NOT EXISTS crm_email_campaign_recipients (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES crm_email_campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  personalization TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  skip_reason TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (campaign_id, contact_id)
);
CREATE TABLE IF NOT EXISTS crm_email_send_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  campaign_recipient_id TEXT,
  contact_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_events (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  campaign_id TEXT,
  contact_id TEXT,
  provider TEXT NOT NULL DEFAULT 'twilio_email',
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  is_unique INTEGER NOT NULL DEFAULT 0,
  occurred_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE (provider, provider_event_id)
);
CREATE TABLE IF NOT EXISTS crm_email_suppressions (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'unsubscribe',
  source_campaign_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_email_automation_steps (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES crm_email_automations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  wait_duration_hours INTEGER,
  template_id TEXT,
  template_version_id TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  UNIQUE (automation_id, step_order)
);
CREATE TABLE IF NOT EXISTS crm_email_automation_enrollments (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES crm_email_automations(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_step_order INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  exit_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (automation_id, contact_id)
);
`;

const DEFAULT_LABELS: Array<[string, string, string]> = [
  ["onboarding", "Onboarding", "#5b8cff"],
  ["product-update", "Product Update", "#7c5cff"],
  ["newsletter", "Newsletter", "#22a06b"],
  ["waitlist", "Waitlist", "#e56910"],
  ["follow-up", "Follow-up", "#6554c0"],
  ["announcement", "Announcement", "#cf3333"],
];

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

export function ensureCrmEmailCampaignSchema(db: Database.Database, nowIso: () => string, newId: () => string): void {
  db.exec(CRM_EMAIL_SQLITE_DDL);
  const alters: Array<[string, string]> = [
    ["campaign_id", "TEXT"],
    ["send_job_id", "TEXT"],
    ["campaign_recipient_id", "TEXT"],
  ];
  for (const [col, typ] of alters) {
    if (!columnExists(db, "crm_email_messages", col)) {
      db.exec(`ALTER TABLE crm_email_messages ADD COLUMN ${col} ${typ}`);
    }
  }

  const ts = nowIso();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO crm_email_labels (id, slug, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const [slug, name, color] of DEFAULT_LABELS) {
    insert.run(newId(), slug, name, color, ts, ts);
  }
}