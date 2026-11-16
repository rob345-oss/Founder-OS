export const EMAIL_LOCALES = ["en", "es"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export const COMMUNICATION_TYPES = ["transactional", "promotional"] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "paused",
  "cancelled",
  "failed",
  "partially_completed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type EmailBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string; align?: "left" | "center" }
  | { type: "paragraph"; text: string; align?: "left" | "center" }
  | { type: "button"; label: string; href: string; align?: "left" | "center" }
  | { type: "divider" }
  | { type: "image"; src: string; alt: string; href?: string }
  | { type: "spacer"; height: number };

export type CrmEmailLabel = {
  id: string;
  slug: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailTemplate = {
  id: string;
  name: string;
  description: string;
  locale: EmailLocale;
  communicationType: CommunicationType;
  status: "draft" | "active" | "archived";
  fromName: string;
  fromAddress: string | null;
  subjectDefault: string;
  previewTextDefault: string;
  currentVersionId: string | null;
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailTemplateVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  blocks: EmailBlock[];
  htmlBody: string;
  textBody: string;
  subject: string;
  previewText: string;
  createdAt: string;
};

export type AudienceFilter = {
  mode?: "all_eligible" | "waitlist" | "manual" | "segment" | "tags" | "country" | "pipeline" | "date_range";
  contactIds?: string[];
  segmentId?: string;
  tags?: string[];
  countryCodes?: string[];
  pipelineStages?: string[];
  createdAfter?: string;
  createdBefore?: string;
  engagedWithCampaignId?: string;
  requireMarketingConsent?: boolean;
};

export type CrmEmailSegment = {
  id: string;
  name: string;
  description: string;
  filter: AudienceFilter;
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailCampaign = {
  id: string;
  name: string;
  description: string;
  internalNotes: string;
  status: CampaignStatus;
  communicationType: CommunicationType;
  templateId: string | null;
  templateVersionId: string | null;
  subject: string;
  previewText: string;
  fromName: string;
  fromAddress: string | null;
  audienceFilter: AudienceFilter;
  excludedContactIds: string[];
  estimatedRecipients: number | null;
  scheduledAt: string | null;
  scheduledTimezone: string;
  startedAt: string | null;
  completedAt: string | null;
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailOverviewMetrics = {
  emailsSent: number;
  deliveryRate: number | null;
  openRateApprox: number | null;
  clickRate: number | null;
  unsubscribeRate: number | null;
  scheduledCount: number;
  activeAutomations: number;
  periodDays: number;
};

export type CrmEmailCampaignAnalytics = {
  campaignId: string;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  uniqueOpens: number;
  uniqueClicks: number;
  unsubscribes: number;
  totalOpens: number;
  totalClicks: number;
  opensAreApproximate: boolean;
};

export type CrmEmailActivityItem = {
  id: string;
  eventType: string;
  occurredAt: string;
  campaignId: string | null;
  campaignName: string | null;
  messageId: string | null;
  metadata: Record<string, unknown>;
  source: "event" | "message" | "campaign";
};