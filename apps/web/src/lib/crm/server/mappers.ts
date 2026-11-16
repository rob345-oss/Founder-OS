import type {
  CrmActivity,
  CrmContact,
  CrmContactListItem,
  CrmEmailMessage,
  CrmFollowUp,
  CrmNote,
  CrmClassification,
} from "../types";

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw) as unknown;
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

type ContactRow = Record<string, unknown>;

export function mapContactRow(row: ContactRow): CrmContact {
  const classifications = parseJsonArray(row.classifications) as CrmClassification[];
  return {
    id: String(row.id),
    tgLeadId: row.tg_lead_id ? String(row.tg_lead_id) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    fullName: String(row.full_name ?? ""),
    primaryEmail: String(row.primary_email),
    additionalEmails: parseJsonArray(row.additional_emails),
    phone: row.phone ? String(row.phone) : null,
    countryCode: row.country_code ? String(row.country_code) : null,
    preferredLanguage: row.preferred_language ? String(row.preferred_language) : null,
    organization: row.organization ? String(row.organization) : null,
    contactSource: row.contact_source ? String(row.contact_source) : null,
    classifications,
    relationshipStatus: String(row.relationship_status) as CrmContact["relationshipStatus"],
    pipelineStage: String(row.pipeline_stage) as CrmContact["pipelineStage"],
    assignedOwnerId: row.assigned_owner_id ? String(row.assigned_owner_id) : null,
    tags: parseJsonArray(row.tags),
    marketingConsent:
      row.marketing_consent === null || row.marketing_consent === undefined
        ? null
        : Boolean(row.marketing_consent),
    nextFollowUpAt: row.next_follow_up_at ? String(row.next_follow_up_at) : null,
    lastInteractionAt: row.last_interaction_at ? String(row.last_interaction_at) : null,
    dateAdded: String(row.date_added),
    waitlistSnapshot: parseJsonObject(row.waitlist_snapshot),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapContactListRow(row: ContactRow): CrmContactListItem {
  const c = mapContactRow(row);
  return {
    id: c.id,
    fullName: c.fullName,
    primaryEmail: c.primaryEmail,
    phone: c.phone,
    organization: c.organization,
    classifications: c.classifications,
    relationshipStatus: c.relationshipStatus,
    pipelineStage: c.pipelineStage,
    tags: c.tags,
    contactSource: c.contactSource,
    nextFollowUpAt: c.nextFollowUpAt,
    lastInteractionAt: c.lastInteractionAt,
    dateAdded: c.dateAdded,
    archivedAt: c.archivedAt,
  };
}

export function mapNoteRow(row: ContactRow): CrmNote {
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    authorUserId: String(row.author_user_id),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapActivityRow(row: ContactRow): CrmActivity {
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    eventType: String(row.event_type),
    source: String(row.source),
    payload: parseJsonObject(row.payload) ?? {},
    occurredAt: String(row.occurred_at),
  };
}

export function mapFollowUpRow(row: ContactRow): CrmFollowUp {
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    dueAt: String(row.due_at),
    priority: String(row.priority) as CrmFollowUp["priority"],
    status: String(row.status) as CrmFollowUp["status"],
    assignedOwnerId: row.assigned_owner_id ? String(row.assigned_owner_id) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapEmailRow(row: ContactRow): CrmEmailMessage {
  return {
    id: String(row.id),
    contactId: row.contact_id ? String(row.contact_id) : null,
    provider: String(row.provider),
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
    direction: String(row.direction) as CrmEmailMessage["direction"],
    fromAddress: row.from_address ? String(row.from_address) : null,
    toAddress: String(row.to_address),
    subject: row.subject ? String(row.subject) : null,
    templateKey: row.template_key ? String(row.template_key) : null,
    campaignKey: row.campaign_key ? String(row.campaign_key) : null,
    deliveryStatus: String(row.delivery_status),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    metadata: parseJsonObject(row.metadata) ?? {},
    createdAt: String(row.created_at),
  };
}
