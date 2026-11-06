import { getDatabase, newId, runMigrations } from '@/lib/db/database';
import type {
  CampaignKind,
  CampaignRow,
  CampaignStatus,
  ContentItemRow,
  ContentStatus,
  GoalPriority,
  GoalRow,
  GoalStatus,
  GoalType,
  IntegrationProviderId,
  IntegrationState,
  KpiKey,
  MarketingPlatform,
  MeasurementType,
  MetricRow,
  WeeklyReviewRow,
  WorkspaceRow,
} from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const ALL_PROVIDER_IDS: IntegrationProviderId[] = [
  'instagram_meta',
  'linkedin',
  'tiktok',
  'youtube_google',
  'facebook',
  'x',
  'google_analytics',
  'other',
];

let migrationsDone = false;

function ensureMigrations(): void {
  if (!migrationsDone) {
    runMigrations();
    migrationsDone = true;
  }
}

export const repo = {
  init(): void {
    ensureMigrations();
    seedIfEmpty();
  },

  listWorkspaces(): WorkspaceRow[] {
    ensureMigrations();
    const db = getDatabase();
    return db.getAllSync('SELECT * FROM workspaces ORDER BY created_at ASC') as WorkspaceRow[];
  },

  createWorkspace(name: string, isExample = false): WorkspaceRow {
    ensureMigrations();
    const db = getDatabase();
    const id = newId();
    const now = new Date().toISOString();
    const defaultKpis = JSON.stringify(['followers', 'engagements', 'published_content']);
    db.runSync(
      `INSERT INTO workspaces (id, name, is_example, dashboard_kpi_keys, created_at) VALUES (?, ?, ?, ?, ?)`,
      id,
      name,
      isExample ? 1 : 0,
      defaultKpis,
      now
    );
    for (const pid of ALL_PROVIDER_IDS) {
      this.upsertIntegration(id, pid, 'coming_later', { note: 'OAuth and sync ship in a later phase.' });
    }
    return this.getWorkspace(id)!;
  },

  getWorkspace(id: string): WorkspaceRow | null {
    ensureMigrations();
    const db = getDatabase();
    const rows = db.getAllSync('SELECT * FROM workspaces WHERE id = ?', id) as WorkspaceRow[];
    return rows[0] ?? null;
  },

  setDashboardKpis(workspaceId: string, keys: KpiKey[]): void {
    ensureMigrations();
    const db = getDatabase();
    db.runSync('UPDATE workspaces SET dashboard_kpi_keys = ? WHERE id = ?', JSON.stringify(keys), workspaceId);
  },

  getDashboardKpis(workspaceId: string): KpiKey[] {
    const w = this.getWorkspace(workspaceId);
    if (!w?.dashboard_kpi_keys) return ['followers', 'engagements', 'published_content'];
    return parseJson(w.dashboard_kpi_keys, ['followers', 'engagements', 'published_content']);
  },

  listGoals(workspaceId: string): GoalRow[] {
    ensureMigrations();
    const db = getDatabase();
    return db.getAllSync('SELECT * FROM goals WHERE workspace_id = ? ORDER BY end_date ASC', workspaceId) as GoalRow[];
  },

  insertGoal(row: Omit<GoalRow, 'id' | 'created_at'> & { id?: string }): GoalRow {
    ensureMigrations();
    const db = getDatabase();
    const id = row.id ?? newId();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO goals (id, workspace_id, name, platform, kpi_key, goal_type, start_value, target_value, start_date, end_date, priority, status, supporting_activities, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      row.workspace_id,
      row.name,
      row.platform,
      row.kpi_key,
      row.goal_type,
      row.start_value,
      row.target_value,
      row.start_date,
      row.end_date,
      row.priority,
      row.status,
      row.supporting_activities,
      now
    );
    return db.getFirstSync('SELECT * FROM goals WHERE id = ?', id) as GoalRow;
  },

  updateGoal(
    id: string,
    patch: Partial<
      Pick<
        GoalRow,
        | 'name'
        | 'platform'
        | 'kpi_key'
        | 'goal_type'
        | 'start_value'
        | 'target_value'
        | 'start_date'
        | 'end_date'
        | 'priority'
        | 'status'
        | 'supporting_activities'
      >
    >
  ): void {
    ensureMigrations();
    const db = getDatabase();
    const cur = db.getAllSync('SELECT * FROM goals WHERE id = ?', id)[0] as GoalRow | undefined;
    if (!cur) return;
    const next = { ...cur, ...patch };
    db.runSync(
      `UPDATE goals SET name=?, platform=?, kpi_key=?, goal_type=?, start_value=?, target_value=?, start_date=?, end_date=?, priority=?, status=?, supporting_activities=? WHERE id=?`,
      next.name,
      next.platform,
      next.kpi_key,
      next.goal_type,
      next.start_value,
      next.target_value,
      next.start_date,
      next.end_date,
      next.priority,
      next.status,
      next.supporting_activities,
      id
    );
  },

  deleteGoal(id: string): void {
    ensureMigrations();
    getDatabase().runSync('DELETE FROM goals WHERE id = ?', id);
  },

  listMetrics(workspaceId: string): MetricRow[] {
    ensureMigrations();
    return getDatabase().getAllSync(
      'SELECT * FROM metrics WHERE workspace_id = ? ORDER BY period_end DESC',
      workspaceId
    ) as MetricRow[];
  },

  insertMetric(
    row: Omit<MetricRow, 'id' | 'created_at'> & { id?: string }
  ): MetricRow {
    ensureMigrations();
    const db = getDatabase();
    const id = row.id ?? newId();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO metrics (id, workspace_id, platform, provider, kpi_key, value, period_start, period_end, measurement_type, source, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      row.workspace_id,
      row.platform,
      row.provider,
      row.kpi_key,
      row.value,
      row.period_start,
      row.period_end,
      row.measurement_type,
      row.source,
      row.notes,
      now
    );
    return db.getFirstSync('SELECT * FROM metrics WHERE id = ?', id) as MetricRow;
  },

  deleteMetric(id: string): void {
    getDatabase().runSync('DELETE FROM metrics WHERE id = ?', id);
  },

  listCampaigns(workspaceId: string): CampaignRow[] {
    ensureMigrations();
    return getDatabase().getAllSync(
      'SELECT * FROM campaigns WHERE workspace_id = ? ORDER BY start_date DESC',
      workspaceId
    ) as CampaignRow[];
  },

  insertCampaign(
    row: Omit<CampaignRow, 'id' | 'created_at'> & { id?: string }
  ): CampaignRow {
    ensureMigrations();
    const db = getDatabase();
    const id = row.id ?? newId();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO campaigns (id, workspace_id, name, objective, start_date, end_date, platforms, kpis, budget_cents, kind, status, results_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      row.workspace_id,
      row.name,
      row.objective,
      row.start_date,
      row.end_date,
      row.platforms,
      row.kpis,
      row.budget_cents,
      row.kind,
      row.status,
      row.results_notes,
      now
    );
    return db.getFirstSync('SELECT * FROM campaigns WHERE id = ?', id) as CampaignRow;
  },

  updateCampaign(id: string, patch: Partial<Pick<CampaignRow, 'name' | 'objective' | 'status' | 'results_notes' | 'end_date'>>): void {
    ensureMigrations();
    const cur = getDatabase().getAllSync('SELECT * FROM campaigns WHERE id = ?', id)[0] as CampaignRow | undefined;
    if (!cur) return;
    const next = { ...cur, ...patch };
    getDatabase().runSync(
      `UPDATE campaigns SET name=?, objective=?, start_date=?, end_date=?, platforms=?, kpis=?, budget_cents=?, kind=?, status=?, results_notes=? WHERE id=?`,
      next.name,
      next.objective,
      next.start_date,
      next.end_date,
      next.platforms,
      next.kpis,
      next.budget_cents,
      next.kind,
      next.status,
      next.results_notes,
      id
    );
  },

  listContent(workspaceId: string): ContentItemRow[] {
    ensureMigrations();
    return getDatabase().getAllSync(
      'SELECT * FROM content_items WHERE workspace_id = ? ORDER BY COALESCE(planned_date, published_date, created_at) DESC',
      workspaceId
    ) as ContentItemRow[];
  },

  insertContent(row: Omit<ContentItemRow, 'id' | 'created_at'> & { id?: string }): ContentItemRow {
    ensureMigrations();
    const db = getDatabase();
    const id = row.id ?? newId();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO content_items (id, workspace_id, campaign_id, title, description, platform, format, pillar, status, planned_date, published_date, performance, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      row.workspace_id,
      row.campaign_id,
      row.title,
      row.description,
      row.platform,
      row.format,
      row.pillar,
      row.status,
      row.planned_date,
      row.published_date,
      row.performance,
      now
    );
    return db.getFirstSync('SELECT * FROM content_items WHERE id = ?', id) as ContentItemRow;
  },

  updateContent(
    id: string,
    patch: Partial<
      Pick<
        ContentItemRow,
        | 'title'
        | 'description'
        | 'platform'
        | 'format'
        | 'pillar'
        | 'status'
        | 'planned_date'
        | 'published_date'
        | 'campaign_id'
        | 'performance'
      >
    >
  ): void {
    ensureMigrations();
    const cur = getDatabase().getAllSync('SELECT * FROM content_items WHERE id = ?', id)[0] as ContentItemRow | undefined;
    if (!cur) return;
    const next = { ...cur, ...patch };
    getDatabase().runSync(
      `UPDATE content_items SET campaign_id=?, title=?, description=?, platform=?, format=?, pillar=?, status=?, planned_date=?, published_date=?, performance=? WHERE id=?`,
      next.campaign_id,
      next.title,
      next.description,
      next.platform,
      next.format,
      next.pillar,
      next.status,
      next.planned_date,
      next.published_date,
      next.performance,
      id
    );
  },

  listWeeklyReviews(workspaceId: string): WeeklyReviewRow[] {
    ensureMigrations();
    return getDatabase().getAllSync(
      'SELECT * FROM weekly_reviews WHERE workspace_id = ? ORDER BY week_start DESC',
      workspaceId
    ) as WeeklyReviewRow[];
  },

  upsertWeeklyReview(
    row: Pick<WeeklyReviewRow, 'workspace_id' | 'week_start'> &
      Partial<Pick<WeeklyReviewRow, 'wins' | 'obstacles' | 'prev_goals_eval' | 'next_priorities'>>
  ): WeeklyReviewRow {
    ensureMigrations();
    const db = getDatabase();
    const existing = db.getAllSync(
      'SELECT * FROM weekly_reviews WHERE workspace_id = ? AND week_start = ?',
      row.workspace_id,
      row.week_start
    ) as WeeklyReviewRow[];
    const now = new Date().toISOString();
    if (existing[0]) {
      db.runSync(
        `UPDATE weekly_reviews SET wins=?, obstacles=?, prev_goals_eval=?, next_priorities=? WHERE id=?`,
        row.wins ?? existing[0].wins,
        row.obstacles ?? existing[0].obstacles,
        row.prev_goals_eval ?? existing[0].prev_goals_eval,
        row.next_priorities ?? existing[0].next_priorities,
        existing[0].id
      );
      return db.getFirstSync('SELECT * FROM weekly_reviews WHERE id = ?', existing[0].id) as WeeklyReviewRow;
    }
    const id = newId();
    db.runSync(
      `INSERT INTO weekly_reviews (id, workspace_id, week_start, wins, obstacles, prev_goals_eval, next_priorities, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      row.workspace_id,
      row.week_start,
      row.wins ?? null,
      row.obstacles ?? null,
      row.prev_goals_eval ?? null,
      row.next_priorities ?? null,
      now
    );
    return db.getFirstSync('SELECT * FROM weekly_reviews WHERE id = ?', id) as WeeklyReviewRow;
  },

  insertCampaignMilestone(campaignId: string, title: string, dueDate: string | null): void {
    ensureMigrations();
    getDatabase().runSync(
      `INSERT INTO campaign_milestones (id, campaign_id, title, due_date, completed_at) VALUES (?, ?, ?, ?, NULL)`,
      newId(),
      campaignId,
      title,
      dueDate
    );
  },

  countCampaignMilestonesDueInRange(workspaceId: string, start: string, end: string): number {
    ensureMigrations();
    const db = getDatabase();
    const rows = db.getAllSync(
      `SELECT cm.due_date FROM campaign_milestones cm
       JOIN campaigns c ON c.id = cm.campaign_id
       WHERE c.workspace_id = ? AND cm.completed_at IS NULL AND cm.due_date IS NOT NULL
         AND cm.due_date >= ? AND cm.due_date <= ?`,
      workspaceId,
      start,
      end
    ) as { due_date: string }[];
    return rows.length;
  },

  listIntegrations(workspaceId: string): { provider_id: string; state: IntegrationState; meta: string | null }[] {
    ensureMigrations();
    return getDatabase().getAllSync(
      'SELECT provider_id, state, meta FROM integration_records WHERE workspace_id = ?',
      workspaceId
    ) as { provider_id: string; state: IntegrationState; meta: string | null }[];
  },

  upsertIntegration(workspaceId: string, providerId: IntegrationProviderId, state: IntegrationState, meta?: unknown): void {
    ensureMigrations();
    const db = getDatabase();
    const existing = db.getAllSync(
      'SELECT id FROM integration_records WHERE workspace_id = ? AND provider_id = ?',
      workspaceId,
      providerId
    ) as { id: string }[];
    const metaStr = meta !== undefined ? JSON.stringify(meta) : null;
    if (existing[0]) {
      db.runSync('UPDATE integration_records SET state = ?, meta = ? WHERE id = ?', state, metaStr, existing[0].id);
    } else {
      db.runSync(
        `INSERT INTO integration_records (id, workspace_id, provider_id, state, meta) VALUES (?, ?, ?, ?, ?)`,
        newId(),
        workspaceId,
        providerId,
        state,
        metaStr
      );
    }
  },

  exportWorkspaceJson(workspaceId: string): string {
    ensureMigrations();
    const w = this.getWorkspace(workspaceId);
    if (!w) return '{}';
    const payload = {
      workspace: w,
      goals: this.listGoals(workspaceId),
      metrics: this.listMetrics(workspaceId),
      campaigns: this.listCampaigns(workspaceId),
      content: this.listContent(workspaceId),
      weeklyReviews: this.listWeeklyReviews(workspaceId),
      integrations: this.listIntegrations(workspaceId),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  },
};

function seedIfEmpty(): void {
  const db = getDatabase();
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM workspaces');
  if ((row?.c ?? 0) > 0) return;

  const ws = repo.createWorkspace('Founder OS', false);
  const sample = repo.createWorkspace('Sample brand (example)', true);

  const today = toISODate(new Date());
  const nextMonth = toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  repo.insertGoal({
    workspace_id: ws.id,
    name: 'Grow LinkedIn followers',
    platform: 'linkedin',
    kpi_key: 'followers',
    goal_type: 'outcome',
    start_value: 1200,
    target_value: 1280,
    start_date: today,
    end_date: nextMonth,
    priority: 'high',
    status: 'active',
    supporting_activities: JSON.stringify(['3 posts/week', 'Comment daily']),
  });

  repo.insertMetric({
    workspace_id: ws.id,
    platform: 'linkedin',
    provider: 'manual',
    kpi_key: 'followers',
    value: 1220,
    period_start: today,
    period_end: today,
    measurement_type: 'actual',
    source: 'manual',
    notes: 'Recorded locally',
  });

  const camp = repo.insertCampaign({
    workspace_id: ws.id,
    name: 'Q4 thought leadership',
    objective: 'Establish category POV',
    start_date: today,
    end_date: nextMonth,
    platforms: JSON.stringify(['linkedin']),
    kpis: JSON.stringify(['impressions', 'engagements']),
    budget_cents: null,
    kind: 'organic',
    status: 'active',
    results_notes: null,
  });

  repo.insertCampaignMilestone(camp.id, 'Publish launch narrative', today);

  repo.insertContent({
    workspace_id: ws.id,
    campaign_id: null,
    title: 'Founder OS positioning post',
    description: 'Outline pillars and proof points',
    platform: 'linkedin',
    format: 'text',
    pillar: 'Product story',
    status: 'drafting',
    planned_date: today,
    published_date: null,
    performance: null,
  });

  void sample;
}
