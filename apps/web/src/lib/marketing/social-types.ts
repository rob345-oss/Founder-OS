export const SOCIAL_PLATFORMS = ["linkedin", "instagram", "facebook", "youtube", "tiktok", "x"] as const;
export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = [
  "idea",
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const SOCIAL_CONNECTION_STATES = [
  "not_connected",
  "connected",
  "token_expired",
  "reauthorization_required",
  "permission_limited",
  "sync_error",
] as const;
export type SocialConnectionState = (typeof SOCIAL_CONNECTION_STATES)[number];

export const EXTERNAL_PUBLISH_STATES = [
  "planned",
  "scheduled_internal",
  "ready_external",
  "published_verified",
  "failed",
] as const;
export type ExternalPublishState = (typeof EXTERNAL_PUBLISH_STATES)[number];

export type SocialMetricSource = "manual" | "provider";

export type SocialAccount = {
  id: string;
  platform: SocialPlatformId;
  accountLabel: string | null;
  externalAccountId: string | null;
  connectionState: SocialConnectionState;
  capabilities: string[];
  lastSyncAt: string | null;
  healthNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialPost = {
  id: string;
  internalLabel: string | null;
  bodyText: string;
  platform: SocialPlatformId;
  campaignId: string | null;
  status: SocialPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  platformPermalink: string | null;
  destinationUrl: string | null;
  ctaText: string | null;
  hashtags: string | null;
  topicTags: string[];
  mediaRefs: string[];
  externalPublishState: ExternalPublishState;
  publishError: string | null;
  isManualTrackOnly: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SocialPostMetrics = {
  id: string;
  postId: string;
  source: SocialMetricSource;
  providerSnapshotId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  impressions: number | null;
  reach: number | null;
  engagements: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  videoViews: number | null;
  watchTimeSec: number | null;
  profileVisits: number | null;
  websiteClicks: number | null;
  followersGained: number | null;
  recordedAt: string;
  syncedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type SocialPostWithMetrics = SocialPost & {
  latestManualMetrics: SocialPostMetrics | null;
  latestProviderMetrics: SocialPostMetrics | null;
  engagementRate: number | null;
};

export type SocialPostInput = {
  internalLabel?: string | null;
  bodyText?: string;
  platform: SocialPlatformId;
  campaignId?: string | null;
  status?: SocialPostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  platformPermalink?: string | null;
  destinationUrl?: string | null;
  ctaText?: string | null;
  hashtags?: string | null;
  topicTags?: string[];
  mediaRefs?: string[];
  isManualTrackOnly?: boolean;
};

export type SocialManualMetricsInput = {
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  videoViews?: number | null;
  profileVisits?: number | null;
  websiteClicks?: number | null;
  notes?: string | null;
};

export type SocialKpiKey =
  | "impressions"
  | "reach"
  | "engagements"
  | "engagementRate"
  | "followerGrowth"
  | "profileVisits"
  | "websiteClicks"
  | "waitlistSignups"
  | "postsPublished"
  | "postsScheduled";

export type SocialOverviewResponse = {
  refreshedAt: string;
  dateRange: import("./types").MarketingDateRange;
  publishArmed: boolean;
  kpis: Record<SocialKpiKey, import("./types").MetricAvailability>;
  series: Record<"impressions" | "reach" | "engagements" | "followersGained" | "websiteClicks", import("./types").SeriesPoint[]>;
  platformSummaries: {
    platform: SocialPlatformId;
    label: string;
    connectionState: SocialConnectionState;
    postsPublished: number;
    impressions: number | null;
    engagements: number | null;
    engagementRate: number | null;
  }[];
  topPosts: {
    id: string;
    preview: string;
    platform: SocialPlatformId;
    publishedAt: string | null;
    impressions: number | null;
    engagementRate: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    clicks: number | null;
  }[];
  upcoming: SocialPost[];
  funnel: {
    stages: { key: string; label: string; count: number | null; kind: "measured" | "attributed" | "estimated" | "unavailable"; note?: string }[];
  };
  filters: { platforms: SocialPlatformId[]; accountIds: string[] };
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
};

/** Valid status transitions for editorial workflow (excluding automated publishing states). */
export const SOCIAL_STATUS_TRANSITIONS: Record<SocialPostStatus, SocialPostStatus[]> = {
  idea: ["draft", "canceled"],
  draft: ["in_review", "scheduled", "canceled", "idea"],
  in_review: ["approved", "draft", "canceled"],
  approved: ["scheduled", "draft", "canceled"],
  scheduled: ["approved", "draft", "canceled", "publishing", "published"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["draft", "scheduled"],
  canceled: ["idea", "draft"],
};