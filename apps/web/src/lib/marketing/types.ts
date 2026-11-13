export type MarketingDateRangePreset = "7d" | "30d" | "90d" | "custom";

export type MarketingDateRange = {
  preset: MarketingDateRangePreset;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  label: string;
};

export type SeriesPoint = { date: string; value: number };

export type MetricAvailability =
  | { status: "live"; value: number; previousValue: number; changePct: number | null; series: SeriesPoint[]; hint?: string }
  | { status: "unconfigured"; message: string }
  | { status: "insufficient_data"; message: string };

export type MarketingKpiKey =
  | "websiteVisitors"
  | "waitlistSignups"
  | "visitorWaitlistConversion"
  | "socialReach"
  | "leadsGenerated"
  | "marketingCustomerConversion";

export type MarketingGrowthSeriesKey = "visitors" | "waitlist" | "leads" | "customers";

export type FunnelStageKey =
  | "websiteVisitors"
  | "waitlistSignups"
  | "qualifiedLeads"
  | "activatedUsers"
  | "payingCustomers";

export type FunnelStage = {
  key: FunnelStageKey;
  label: string;
  count: number;
  previousCount: number;
  conversionFromPrevious: number | null;
  dropOffPct: number | null;
  href: string;
  note?: string;
};

export type ContentPreviewRow = {
  id: string;
  title: string;
  platform: string;
  format: string;
  publishedAt: string | null;
  reach: number | null;
  engagementRate: number | null;
  clicks: number | null;
  attributedSignups: number | null;
};

export type MarketingActivityItem = {
  id: string;
  type: string;
  summary: string;
  occurredAt: string;
  href: string | null;
};

export type MarketingPriority = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  explanation: string;
  metric?: string;
  href: string;
};

export type IntegrationCardState = "connected" | "setup_required" | "unsupported" | "error";

export type MarketingIntegrationStatus = {
  id: string;
  label: string;
  state: IntegrationCardState;
  detail: string;
};

export type MarketingOverviewResponse = {
  refreshedAt: string;
  dateRange: MarketingDateRange;
  kpis: Record<MarketingKpiKey, MetricAvailability>;
  growth: Record<MarketingGrowthSeriesKey, MetricAvailability>;
  growthInsight: string | null;
  funnel: { stages: FunnelStage[]; limitation?: string };
  topContent: ContentPreviewRow[];
  activity: MarketingActivityItem[];
  priorities: MarketingPriority[];
  integrationsSummary: { connected: number; total: number };
};

export type MarketingCampaignStatus = "draft" | "active" | "paused" | "completed";

export type MarketingCampaign = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  channel: string | null;
  startDate: string | null;
  endDate: string | null;
  status: MarketingCampaignStatus;
  plannedBudget: number | null;
  actualSpend: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingGoalStatus = "planned" | "active" | "completed" | "cancelled";

export type MarketingGoal = {
  id: string;
  title: string;
  metricKey: string;
  targetValue: number;
  deadline: string | null;
  status: MarketingGoalStatus;
  createdAt: string;
  updatedAt: string;
};

export type MarketingContentStatus =
  | "idea"
  | "script"
  | "ready_to_film"
  | "filmed"
  | "editing"
  | "scheduled"
  | "published";

export type MarketingContentItem = {
  id: string;
  title: string;
  contentType: string | null;
  platform: string | null;
  hook: string | null;
  cta: string | null;
  status: MarketingContentStatus;
  publishDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingSettings = {
  defaultDateRange: MarketingDateRangePreset;
  timezone: string;
  qualifiedLeadStages: string[];
  dataRefreshNote: string | null;
};
