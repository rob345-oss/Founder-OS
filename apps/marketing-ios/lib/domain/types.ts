/** Marketing platforms — normalized keys for analytics and goals */
export type MarketingPlatform =
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'website'
  | 'other';

/** KPI keys — must stay consistent for goal ↔ metric matching */
export type KpiKey =
  | 'followers'
  | 'follower_growth'
  | 'reach'
  | 'impressions'
  | 'engagements'
  | 'engagement_rate'
  | 'profile_visits'
  | 'link_clicks'
  | 'website_visits'
  | 'leads'
  | 'conversion_rate'
  | 'published_content'
  | 'campaign_performance';

export type GoalType = 'outcome' | 'activity';

export type GoalStatus = 'planned' | 'active' | 'completed' | 'paused' | 'at_risk';

export type GoalPriority = 'low' | 'medium' | 'high';

export type ContentStatus = 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published' | 'archived';

export type CampaignKind = 'organic' | 'paid';

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused';

export type IntegrationProviderId =
  | 'instagram_meta'
  | 'linkedin'
  | 'tiktok'
  | 'youtube_google'
  | 'facebook'
  | 'x'
  | 'google_analytics'
  | 'other';

export type IntegrationState =
  | 'not_configured'
  | 'coming_later'
  | 'connected'
  | 'expired'
  | 'error';

export type MeasurementType = 'actual' | 'calculated';

/** Dashboard / analytics time window */
export type ReportingPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface WorkspaceRow {
  id: string;
  name: string;
  is_example: number;
  dashboard_kpi_keys: string | null;
  created_at: string;
}

export interface GoalRow {
  id: string;
  workspace_id: string;
  name: string;
  platform: string;
  kpi_key: string;
  goal_type: GoalType;
  start_value: number | null;
  target_value: number;
  start_date: string;
  end_date: string;
  priority: GoalPriority;
  status: GoalStatus;
  supporting_activities: string | null;
  created_at: string;
}

export interface GoalMilestoneRow {
  id: string;
  goal_id: string;
  title: string;
  target_date: string | null;
  target_value: number | null;
  completed_at: string | null;
}

export interface MetricRow {
  id: string;
  workspace_id: string;
  platform: string;
  provider: string;
  kpi_key: string;
  value: number;
  period_start: string;
  period_end: string;
  measurement_type: MeasurementType;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface CampaignRow {
  id: string;
  workspace_id: string;
  name: string;
  objective: string | null;
  start_date: string;
  end_date: string;
  platforms: string;
  kpis: string | null;
  budget_cents: number | null;
  kind: CampaignKind;
  status: CampaignStatus;
  results_notes: string | null;
  created_at: string;
}

export interface CampaignMilestoneRow {
  id: string;
  campaign_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
}

export interface ContentItemRow {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  title: string;
  description: string | null;
  platform: string;
  format: string | null;
  pillar: string | null;
  status: ContentStatus;
  planned_date: string | null;
  published_date: string | null;
  performance: string | null;
  created_at: string;
}

export interface WeeklyReviewRow {
  id: string;
  workspace_id: string;
  week_start: string;
  wins: string | null;
  obstacles: string | null;
  prev_goals_eval: string | null;
  next_priorities: string | null;
  created_at: string;
}

export interface IntegrationRecordRow {
  id: string;
  workspace_id: string;
  provider_id: string;
  state: IntegrationState;
  meta: string | null;
}
