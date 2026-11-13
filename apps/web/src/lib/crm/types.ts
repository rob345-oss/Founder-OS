export const CRM_CLASSIFICATIONS = [
  "family_friend",
  "general_contact",
  "waitlist_candidate",
  "potential_customer",
  "pilot_candidate",
  "active_customer",
  "organization_partner",
  "other",
] as const;

export type CrmClassification = (typeof CRM_CLASSIFICATIONS)[number];

export const CRM_RELATIONSHIP_STATUSES = [
  "new",
  "not_contacted",
  "contacted",
  "interested",
  "follow_up_needed",
  "pilot_invited",
  "pilot_active",
  "converted",
  "not_interested",
  "inactive",
] as const;

export type CrmRelationshipStatus = (typeof CRM_RELATIONSHIP_STATUSES)[number];

export const CRM_PIPELINE_STAGES = [
  "new_lead",
  "contacted",
  "interested",
  "qualified",
  "pilot_candidate",
  "pilot_active",
  "converted",
  "closed",
] as const;

export type CrmPipelineStage = (typeof CRM_PIPELINE_STAGES)[number];

export const CRM_FOLLOW_UP_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type CrmFollowUpPriority = (typeof CRM_FOLLOW_UP_PRIORITIES)[number];

export type CrmContact = {
  id: string;
  tgLeadId: string | null;
  archivedAt: string | null;
  fullName: string;
  primaryEmail: string;
  additionalEmails: string[];
  phone: string | null;
  countryCode: string | null;
  preferredLanguage: string | null;
  organization: string | null;
  contactSource: string | null;
  classifications: CrmClassification[];
  relationshipStatus: CrmRelationshipStatus;
  pipelineStage: CrmPipelineStage;
  assignedOwnerId: string | null;
  tags: string[];
  marketingConsent: boolean | null;
  nextFollowUpAt: string | null;
  lastInteractionAt: string | null;
  dateAdded: string;
  waitlistSnapshot: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmContactListItem = Pick<
  CrmContact,
  | "id"
  | "fullName"
  | "primaryEmail"
  | "phone"
  | "organization"
  | "classifications"
  | "relationshipStatus"
  | "pipelineStage"
  | "tags"
  | "contactSource"
  | "nextFollowUpAt"
  | "lastInteractionAt"
  | "dateAdded"
  | "archivedAt"
>;

export type CrmNote = {
  id: string;
  contactId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivity = {
  id: string;
  contactId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type CrmFollowUp = {
  id: string;
  contactId: string;
  title: string;
  description: string | null;
  dueAt: string;
  priority: CrmFollowUpPriority;
  status: "pending" | "completed" | "cancelled";
  assignedOwnerId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailMessage = {
  id: string;
  contactId: string | null;
  provider: string;
  providerMessageId: string | null;
  direction: "outbound" | "inbound";
  fromAddress: string | null;
  toAddress: string;
  subject: string | null;
  templateKey: string | null;
  campaignKey: string | null;
  deliveryStatus: string;
  sentAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CrmDashboardMetrics = {
  totalContacts: number;
  activeWaitlist: number;
  activeProspects: number;
  pilotCandidates: number;
  activeCustomers: number;
  followUpsDue: number;
  emailsSentLast30Days: number;
  pipeline: { stage: CrmPipelineStage; count: number }[];
  recentActivity: CrmActivity[];
  followUpBuckets: {
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    completedRecently: number;
  };
};

export type TgLeadRecord = {
  id: string;
  email: string;
  name?: string | null;
  message?: string | null;
  topic: string;
  status: string;
  page?: string | null;
  country_code?: string | null;
  protection_audience?: string | null;
  beta_testing_interest?: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  created_at?: string;
  updated_at?: string;
  marketing_consent?: boolean | null;
};

export type TgAuthMe = {
  id: string;
  email: string;
  application_role?: string;
  roles?: string[];
  is_admin?: boolean;
};
