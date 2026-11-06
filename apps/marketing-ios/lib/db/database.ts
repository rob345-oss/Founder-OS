import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'marketing_command_center.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_example INTEGER NOT NULL DEFAULT 0,
    dashboard_kpi_keys TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    kpi_key TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK(goal_type IN ('outcome','activity')),
    start_value REAL,
    target_value REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    supporting_activities TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS goal_milestones (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target_date TEXT,
    target_value REAL,
    completed_at TEXT,
    FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'manual',
    kpi_key TEXT NOT NULL,
    value REAL NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    measurement_type TEXT NOT NULL CHECK(measurement_type IN ('actual','calculated')),
    source TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    objective TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    platforms TEXT NOT NULL,
    kpis TEXT,
    budget_cents INTEGER,
    kind TEXT NOT NULL CHECK(kind IN ('organic','paid')),
    status TEXT NOT NULL,
    results_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS campaign_milestones (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    completed_at TEXT,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    campaign_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT NOT NULL,
    format TEXT,
    pillar TEXT,
    status TEXT NOT NULL,
    planned_date TEXT,
    published_date TEXT,
    performance TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    wins TEXT,
    obstacles TEXT,
    prev_goals_eval TEXT,
    next_priorities TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS integration_records (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    state TEXT NOT NULL,
    meta TEXT,
    UNIQUE(workspace_id, provider_id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_goals_workspace ON goals(workspace_id);`,
  `CREATE INDEX IF NOT EXISTS idx_metrics_workspace ON metrics(workspace_id);`,
  `CREATE INDEX IF NOT EXISTS idx_content_workspace ON content_items(workspace_id);`,
];

export function runMigrations(): void {
  const db = getDatabase();
  db.execSync('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS) {
    db.execSync(sql);
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
