import type Database from "better-sqlite3";

import { normalizeEmail } from "../normalize";
import type {
  CrmActivity,
  CrmClassification,
  CrmContact,
  CrmContactListItem,
  CrmDashboardMetrics,
  CrmEmailMessage,
  CrmFollowUp,
  CrmNote,
  CrmPipelineStage,
  CrmRelationshipStatus,
  TgLeadRecord,
} from "../types";
import {
  classificationsFromLead,
  contactSourceFromLead,
  relationshipFromLeadStatus,
  waitlistSnapshotFromLead,
} from "./lead-map";
import { mapActivityRow, mapContactListRow, mapContactRow, mapEmailRow, mapFollowUpRow, mapNoteRow } from "./mappers";
import { getCrmDriver, getCrmSqlite, newId, nowIso, withPgClient } from "./db";

export type ContactListQuery = {
  q?: string;
  classification?: string;
  relationshipStatus?: string;
  pipelineStage?: string;
  tag?: string;
  source?: string;
  archived?: boolean;
  sort?: "date_added" | "last_interaction" | "next_follow_up";
  direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type CreateContactInput = {
  fullName?: string;
  primaryEmail: string;
  additionalEmails?: string[];
  phone?: string | null;
  countryCode?: string | null;
  preferredLanguage?: string | null;
  organization?: string | null;
  contactSource?: string | null;
  classifications?: CrmClassification[];
  relationshipStatus?: CrmRelationshipStatus;
  pipelineStage?: CrmPipelineStage;
  tags?: string[];
  marketingConsent?: boolean | null;
};

// --- SQLite implementation ---

function sqliteListContacts(db: Database.Database, query: ContactListQuery): { items: CrmContactListItem[]; total: number } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.archived) where.push("archived_at IS NOT NULL");
  else where.push("archived_at IS NULL");

  if (query.q?.trim()) {
    const like = `%${query.q.trim().toLowerCase()}%`;
    where.push(
      "(LOWER(full_name) LIKE ? OR LOWER(primary_email) LIKE ? OR LOWER(COALESCE(phone,'')) LIKE ? OR LOWER(COALESCE(organization,'')) LIKE ?)",
    );
    params.push(like, like, like, like);
  }
  if (query.classification) {
    where.push("classifications LIKE ?");
    params.push(`%"${query.classification}"%`);
  }
  if (query.relationshipStatus) {
    where.push("relationship_status = ?");
    params.push(query.relationshipStatus);
  }
  if (query.pipelineStage) {
    where.push("pipeline_stage = ?");
    params.push(query.pipelineStage);
  }
  if (query.tag) {
    where.push("tags LIKE ?");
    params.push(`%"${query.tag}"%`);
  }
  if (query.source) {
    where.push("contact_source LIKE ?");
    params.push(`%${query.source}%`);
  }

  const sortCol =
    query.sort === "last_interaction"
      ? "last_interaction_at"
      : query.sort === "next_follow_up"
        ? "next_follow_up_at"
        : "date_added";
  const dir = query.direction === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS c FROM crm_contacts ${whereSql}`).get(...params) as { c: number };

  const rows = db
    .prepare(
      `SELECT * FROM crm_contacts ${whereSql} ORDER BY ${sortCol} IS NULL, ${sortCol} ${dir} LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { items: rows.map(mapContactListRow), total: total.c };
}

function sqliteGetContact(db: Database.Database, id: string): CrmContact | null {
  const row = db.prepare("SELECT * FROM crm_contacts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapContactRow(row) : null;
}

function sqliteInsertContact(db: Database.Database, input: CreateContactInput, extra?: Partial<CrmContact>): CrmContact {
  const ts = nowIso();
  const id = newId();
  const emailNorm = normalizeEmail(input.primaryEmail);
  const row = {
    id,
    tg_lead_id: extra?.tgLeadId ?? null,
    archived_at: null,
    full_name: input.fullName?.trim() ?? "",
    primary_email: input.primaryEmail.trim(),
    primary_email_normalized: emailNorm,
    additional_emails: JSON.stringify(input.additionalEmails ?? []),
    phone: input.phone ?? null,
    country_code: input.countryCode ?? null,
    preferred_language: input.preferredLanguage ?? null,
    organization: input.organization ?? null,
    contact_source: input.contactSource ?? null,
    classifications: JSON.stringify(input.classifications ?? ["general_contact"]),
    relationship_status: input.relationshipStatus ?? "new",
    pipeline_stage: input.pipelineStage ?? "new_lead",
    assigned_owner_id: null,
    contact_preferences: "{}",
    tags: JSON.stringify(input.tags ?? []),
    marketing_consent: input.marketingConsent === undefined ? null : input.marketingConsent ? 1 : 0,
    next_follow_up_at: extra?.nextFollowUpAt ?? null,
    last_interaction_at: extra?.lastInteractionAt ?? ts,
    date_added: extra?.dateAdded ?? ts,
    waitlist_snapshot: extra?.waitlistSnapshot ? JSON.stringify(extra.waitlistSnapshot) : null,
    created_at: ts,
    updated_at: ts,
  };

  db.prepare(
    `INSERT INTO crm_contacts (
      id, tg_lead_id, archived_at, full_name, primary_email, primary_email_normalized,
      additional_emails, phone, country_code, preferred_language, organization, contact_source,
      classifications, relationship_status, pipeline_stage, assigned_owner_id, contact_preferences,
      tags, marketing_consent, next_follow_up_at, last_interaction_at, date_added, waitlist_snapshot,
      created_at, updated_at
    ) VALUES (
      @id, @tg_lead_id, @archived_at, @full_name, @primary_email, @primary_email_normalized,
      @additional_emails, @phone, @country_code, @preferred_language, @organization, @contact_source,
      @classifications, @relationship_status, @pipeline_stage, @assigned_owner_id, @contact_preferences,
      @tags, @marketing_consent, @next_follow_up_at, @last_interaction_at, @date_added, @waitlist_snapshot,
      @created_at, @updated_at
    )`,
  ).run(row);

  return mapContactRow(row as Record<string, unknown>);
}

function sqliteRecordActivity(
  db: Database.Database,
  contactId: string,
  eventType: string,
  payload: Record<string, unknown>,
  opts?: { idempotencyKey?: string; source?: string; occurredAt?: string },
): CrmActivity | null {
  const idempotencyKey = opts?.idempotencyKey ?? null;
  if (idempotencyKey) {
    const existing = db
      .prepare("SELECT id FROM crm_activities WHERE contact_id = ? AND idempotency_key = ?")
      .get(contactId, idempotencyKey) as { id: string } | undefined;
    if (existing) return null;
  }
  const ts = nowIso();
  const id = newId();
  const activity = {
    id,
    contact_id: contactId,
    event_type: eventType,
    source: opts?.source ?? "crm",
    idempotency_key: idempotencyKey,
    payload: JSON.stringify(payload),
    occurred_at: opts?.occurredAt ?? ts,
    created_at: ts,
  };
  db.prepare(
    `INSERT INTO crm_activities (id, contact_id, event_type, source, idempotency_key, payload, occurred_at, created_at)
     VALUES (@id, @contact_id, @event_type, @source, @idempotency_key, @payload, @occurred_at, @created_at)`,
  ).run(activity);
  db.prepare("UPDATE crm_contacts SET last_interaction_at = ?, updated_at = ? WHERE id = ?").run(
    activity.occurred_at,
    ts,
    contactId,
  );
  return mapActivityRow(activity as Record<string, unknown>);
}

export function upsertContactFromLeadSqlite(db: Database.Database, lead: TgLeadRecord): { contact: CrmContact; created: boolean } {
  const existingByLead = db
    .prepare("SELECT * FROM crm_contacts WHERE tg_lead_id = ?")
    .get(lead.id) as Record<string, unknown> | undefined;

  const emailNorm = normalizeEmail(lead.email);
  const snapshot = waitlistSnapshotFromLead(lead);
  const classifications = classificationsFromLead(lead);
  const relationship = relationshipFromLeadStatus(lead.status);
  const source = contactSourceFromLead(lead);
  const ts = nowIso();

  if (existingByLead) {
    const mergedClassifications = [
      ...new Set([
        ...JSON.parse(String(existingByLead.classifications ?? "[]")),
        ...classifications,
      ]),
    ];
    db.prepare(
      `UPDATE crm_contacts SET
        full_name = COALESCE(NULLIF(?, ''), full_name),
        primary_email = ?,
        primary_email_normalized = ?,
        country_code = COALESCE(?, country_code),
        contact_source = COALESCE(?, contact_source),
        classifications = ?,
        relationship_status = ?,
        waitlist_snapshot = ?,
        marketing_consent = COALESCE(?, marketing_consent),
        last_interaction_at = ?,
        updated_at = ?
      WHERE id = ?`,
    ).run(
      lead.name?.trim() ?? "",
      lead.email,
      emailNorm,
      lead.country_code ?? null,
      source,
      JSON.stringify(mergedClassifications),
      relationship,
      JSON.stringify(snapshot),
      lead.marketing_consent === undefined ? null : lead.marketing_consent ? 1 : 0,
      lead.updated_at ?? ts,
      ts,
      existingByLead.id,
    );
    const contact = sqliteGetContact(db, String(existingByLead.id))!;
    return { contact, created: false };
  }

  const existingByEmail = db
    .prepare("SELECT * FROM crm_contacts WHERE primary_email_normalized = ? AND archived_at IS NULL")
    .get(emailNorm) as Record<string, unknown> | undefined;

  if (existingByEmail) {
    db.prepare(
      `UPDATE crm_contacts SET tg_lead_id = ?, waitlist_snapshot = ?, classifications = ?, relationship_status = ?, updated_at = ? WHERE id = ?`,
    ).run(
      lead.id,
      JSON.stringify(snapshot),
      JSON.stringify([...new Set([...JSON.parse(String(existingByEmail.classifications ?? "[]")), ...classifications])]),
      relationship,
      ts,
      existingByEmail.id,
    );
    const contactId = String(existingByEmail.id);
    sqliteRecordActivity(db, contactId, "joined_waitlist", { tgLeadId: lead.id, topic: lead.topic }, {
      idempotencyKey: `lead:${lead.id}:joined_waitlist`,
      source: "waitlist",
      occurredAt: lead.created_at,
    });
    return { contact: sqliteGetContact(db, contactId)!, created: false };
  }

  const contact = sqliteInsertContact(
    db,
    {
      fullName: lead.name?.trim() ?? "",
      primaryEmail: lead.email,
      countryCode: lead.country_code ?? null,
      contactSource: source,
      classifications,
      relationshipStatus: relationship,
      marketingConsent: lead.marketing_consent ?? null,
    },
    {
      tgLeadId: lead.id,
      waitlistSnapshot: snapshot,
      dateAdded: lead.created_at ?? ts,
      lastInteractionAt: lead.updated_at ?? lead.created_at ?? ts,
    },
  );

  sqliteRecordActivity(db, contact.id, "contact_created", { source: "waitlist_sync" }, {
    idempotencyKey: `contact:${contact.id}:created`,
    source: "crm",
  });
  sqliteRecordActivity(db, contact.id, "joined_waitlist", { tgLeadId: lead.id, topic: lead.topic }, {
    idempotencyKey: `lead:${lead.id}:joined_waitlist`,
    source: "waitlist",
    occurredAt: lead.created_at,
  });

  return { contact, created: true };
}

export async function syncLeadsIntoStore(leads: TgLeadRecord[]): Promise<{ upserted: number; created: number }> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (query) => {
      let upserted = 0;
      let created = 0;
      for (const lead of leads) {
        const result = await upsertContactFromLeadPg(query, lead);
        upserted += 1;
        if (result.created) created += 1;
      }
      return { upserted, created };
    });
  }
  const db = getCrmSqlite();
  let upserted = 0;
  let created = 0;
  const tx = db.transaction((items: TgLeadRecord[]) => {
    for (const lead of items) {
      const result = upsertContactFromLeadSqlite(db, lead);
      upserted += 1;
      if (result.created) created += 1;
    }
  });
  tx(leads);
  return { upserted, created };
}

async function upsertContactFromLeadPg(
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>,
  lead: TgLeadRecord,
): Promise<{ created: boolean }> {
  const emailNorm = normalizeEmail(lead.email);
  const snapshot = waitlistSnapshotFromLead(lead);
  const classifications = classificationsFromLead(lead);
  const relationship = relationshipFromLeadStatus(lead.status);
  const source = contactSourceFromLead(lead);
  const ts = nowIso();

  const existing = (await query("SELECT id FROM crm_contacts WHERE tg_lead_id = $1", [lead.id])) as { id: string }[];
  if (existing[0]) {
    await query(
      `UPDATE crm_contacts SET full_name = COALESCE(NULLIF($1, ''), full_name), primary_email = $2,
       primary_email_normalized = $3, waitlist_snapshot = $4::jsonb, classifications = $5::jsonb,
       relationship_status = $6, contact_source = COALESCE($7, contact_source), updated_at = $8
       WHERE tg_lead_id = $9`,
      [
        lead.name?.trim() ?? "",
        lead.email,
        emailNorm,
        JSON.stringify(snapshot),
        JSON.stringify(classifications),
        relationship,
        source,
        ts,
        lead.id,
      ],
    );
    return { created: false };
  }

  const id = newId();
  await query(
    `INSERT INTO crm_contacts (
      id, tg_lead_id, full_name, primary_email, primary_email_normalized, country_code,
      contact_source, classifications, relationship_status, pipeline_stage, waitlist_snapshot,
      last_interaction_at, date_added, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'new_lead',$10::jsonb,$11,$12,$13,$14)
    ON CONFLICT (tg_lead_id) DO NOTHING`,
    [
      id,
      lead.id,
      lead.name?.trim() ?? "",
      lead.email,
      emailNorm,
      lead.country_code ?? null,
      source,
      JSON.stringify(classifications),
      relationship,
      JSON.stringify(snapshot),
      lead.updated_at ?? lead.created_at ?? ts,
      lead.created_at ?? ts,
      ts,
      ts,
    ],
  );

  await query(
    `INSERT INTO crm_activities (contact_id, event_type, source, idempotency_key, payload, occurred_at)
     SELECT c.id, 'joined_waitlist', 'waitlist', $1, $2::jsonb, $3
     FROM crm_contacts c WHERE c.tg_lead_id = $4
     ON CONFLICT (contact_id, idempotency_key) DO NOTHING`,
    [`lead:${lead.id}:joined_waitlist`, JSON.stringify({ tgLeadId: lead.id, topic: lead.topic }), lead.created_at ?? ts, lead.id],
  );
  return { created: true };
}

export async function listContacts(query: ContactListQuery): Promise<{ items: CrmContactListItem[]; total: number }> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
      const offset = Math.max(query.offset ?? 0, 0);
      const where = query.archived ? "archived_at IS NOT NULL" : "archived_at IS NULL";
      const rows = (await q(
        `SELECT * FROM crm_contacts WHERE ${where} ORDER BY date_added DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      )) as Record<string, unknown>[];
      const totalRows = (await q(`SELECT COUNT(*)::int AS c FROM crm_contacts WHERE ${where}`)) as { c: number }[];
      return { items: rows.map(mapContactListRow), total: totalRows[0]?.c ?? 0 };
    });
  }
  return sqliteListContacts(getCrmSqlite(), query);
}

export async function getContact(id: string): Promise<CrmContact | null> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q("SELECT * FROM crm_contacts WHERE id = $1", [id])) as Record<string, unknown>[];
      return rows[0] ? mapContactRow(rows[0]) : null;
    });
  }
  return sqliteGetContact(getCrmSqlite(), id);
}

export async function createContact(input: CreateContactInput, authorUserId: string): Promise<CrmContact> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const id = newId();
      const ts = nowIso();
      const emailNorm = normalizeEmail(input.primaryEmail);
      await q(
        `INSERT INTO crm_contacts (
          id, full_name, primary_email, primary_email_normalized, additional_emails, phone, country_code,
          preferred_language, organization, contact_source, classifications, relationship_status, pipeline_stage,
          tags, marketing_consent, last_interaction_at, date_added, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14::jsonb,$15,$16,$17,$18,$19)`,
        [
          id,
          input.fullName?.trim() ?? "",
          input.primaryEmail.trim(),
          emailNorm,
          JSON.stringify(input.additionalEmails ?? []),
          input.phone ?? null,
          input.countryCode ?? null,
          input.preferredLanguage ?? null,
          input.organization ?? null,
          input.contactSource ?? "manual",
          JSON.stringify(input.classifications ?? ["general_contact"]),
          input.relationshipStatus ?? "new",
          input.pipelineStage ?? "new_lead",
          JSON.stringify(input.tags ?? []),
          input.marketingConsent ?? null,
          ts,
          ts,
          ts,
          ts,
        ],
      );
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, idempotency_key, payload, occurred_at)
         VALUES ($1, 'contact_created', 'crm', $2, $3::jsonb, $4)
         ON CONFLICT (contact_id, idempotency_key) DO NOTHING`,
        [id, `contact:${id}:created`, JSON.stringify({ authorUserId }), ts],
      );
      const rows = (await q("SELECT * FROM crm_contacts WHERE id = $1", [id])) as Record<string, unknown>[];
      return mapContactRow(rows[0]);
    });
  }
  const db = getCrmSqlite();
  const contact = sqliteInsertContact(db, { ...input, contactSource: input.contactSource ?? "manual" });
  sqliteRecordActivity(db, contact.id, "contact_created", { authorUserId }, {
    idempotencyKey: `contact:${contact.id}:created`,
  });
  return contact;
}

export async function updateContact(
  id: string,
  patch: Partial<CreateContactInput> & { pipelineStage?: CrmPipelineStage; relationshipStatus?: CrmRelationshipStatus },
  actorUserId: string,
): Promise<CrmContact | null> {
  const existing = await getContact(id);
  if (!existing) return null;

  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const ts = nowIso();
      await q(
        `UPDATE crm_contacts SET
          full_name = COALESCE($2, full_name),
          primary_email = COALESCE($3, primary_email),
          phone = COALESCE($4, phone),
          organization = COALESCE($5, organization),
          classifications = COALESCE($6::jsonb, classifications),
          relationship_status = COALESCE($7, relationship_status),
          pipeline_stage = COALESCE($8, pipeline_stage),
          tags = COALESCE($9::jsonb, tags),
          updated_at = $10
        WHERE id = $1`,
        [
          id,
          patch.fullName,
          patch.primaryEmail,
          patch.phone,
          patch.organization,
          patch.classifications ? JSON.stringify(patch.classifications) : null,
          patch.relationshipStatus,
          patch.pipelineStage,
          patch.tags ? JSON.stringify(patch.tags) : null,
          ts,
        ],
      );
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at)
         VALUES ($1, 'contact_updated', 'crm', $2::jsonb, $3)`,
        [id, JSON.stringify({ actorUserId, fields: Object.keys(patch) }), ts],
      );
      const rows = (await q("SELECT * FROM crm_contacts WHERE id = $1", [id])) as Record<string, unknown>[];
      return rows[0] ? mapContactRow(rows[0]) : null;
    });
  }

  const db = getCrmSqlite();
  const ts = nowIso();
  const prev = sqliteGetContact(db, id);
  if (!prev) return null;

  db.prepare(
    `UPDATE crm_contacts SET
      full_name = COALESCE(?, full_name),
      primary_email = COALESCE(?, primary_email),
      primary_email_normalized = COALESCE(?, primary_email_normalized),
      phone = COALESCE(?, phone),
      organization = COALESCE(?, organization),
      classifications = COALESCE(?, classifications),
      relationship_status = COALESCE(?, relationship_status),
      pipeline_stage = COALESCE(?, pipeline_stage),
      tags = COALESCE(?, tags),
      updated_at = ?
    WHERE id = ?`,
  ).run(
    patch.fullName,
    patch.primaryEmail,
    patch.primaryEmail ? normalizeEmail(patch.primaryEmail) : null,
    patch.phone,
    patch.organization,
    patch.classifications ? JSON.stringify(patch.classifications) : null,
    patch.relationshipStatus,
    patch.pipelineStage,
    patch.tags ? JSON.stringify(patch.tags) : null,
    ts,
    id,
  );

  if (patch.pipelineStage && patch.pipelineStage !== prev.pipelineStage) {
    sqliteRecordActivity(db, id, "pipeline_changed", { from: prev.pipelineStage, to: patch.pipelineStage, actorUserId });
  }
  if (patch.relationshipStatus && patch.relationshipStatus !== prev.relationshipStatus) {
    sqliteRecordActivity(db, id, "status_changed", { from: prev.relationshipStatus, to: patch.relationshipStatus, actorUserId });
  }

  return sqliteGetContact(db, id);
}

export async function archiveContact(id: string, actorUserId: string): Promise<boolean> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const ts = nowIso();
      const rows = (await q("UPDATE crm_contacts SET archived_at = $2, updated_at = $2 WHERE id = $1 AND archived_at IS NULL RETURNING id", [
        id,
        ts,
      ])) as { id: string }[];
      if (!rows[0]) return false;
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at) VALUES ($1, 'archived', 'crm', $2::jsonb, $3)`,
        [id, JSON.stringify({ actorUserId }), ts],
      );
      return true;
    });
  }
  const db = getCrmSqlite();
  const ts = nowIso();
  const res = db.prepare("UPDATE crm_contacts SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL").run(ts, ts, id);
  if (res.changes === 0) return false;
  sqliteRecordActivity(db, id, "archived", { actorUserId });
  return true;
}

export async function listNotes(contactId: string): Promise<CrmNote[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q("SELECT * FROM crm_notes WHERE contact_id = $1 ORDER BY created_at DESC", [contactId])) as Record<
        string,
        unknown
      >[];
      return rows.map(mapNoteRow);
    });
  }
  const rows = getCrmSqlite()
    .prepare("SELECT * FROM crm_notes WHERE contact_id = ? ORDER BY created_at DESC")
    .all(contactId) as Record<string, unknown>[];
  return rows.map(mapNoteRow);
}

export async function addNote(contactId: string, authorUserId: string, body: string): Promise<CrmNote> {
  const ts = nowIso();
  const id = newId();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      await q(
        "INSERT INTO crm_notes (id, contact_id, author_user_id, body, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, contactId, authorUserId, body.trim(), ts, ts],
      );
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at) VALUES ($1, 'note_added', 'crm', $2::jsonb, $3)`,
        [contactId, JSON.stringify({ noteId: id }), ts],
      );
      const rows = (await q("SELECT * FROM crm_notes WHERE id = $1", [id])) as Record<string, unknown>[];
      return mapNoteRow(rows[0]);
    });
  }
  const db = getCrmSqlite();
  db.prepare(
    "INSERT INTO crm_notes (id, contact_id, author_user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, contactId, authorUserId, body.trim(), ts, ts);
  sqliteRecordActivity(db, contactId, "note_added", { noteId: id });
  const row = db.prepare("SELECT * FROM crm_notes WHERE id = ?").get(id) as Record<string, unknown>;
  return mapNoteRow(row);
}

export async function updateNote(noteId: string, editorUserId: string, body: string): Promise<CrmNote | null> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const prevRows = (await q("SELECT * FROM crm_notes WHERE id = $1", [noteId])) as Record<string, unknown>[];
      if (!prevRows[0]) return null;
      await q(
        "INSERT INTO crm_note_revisions (note_id, editor_user_id, previous_body, revised_at) VALUES ($1,$2,$3,$4)",
        [noteId, editorUserId, String(prevRows[0].body), ts],
      );
      await q("UPDATE crm_notes SET body = $2, updated_at = $3 WHERE id = $1", [noteId, body.trim(), ts]);
      const rows = (await q("SELECT * FROM crm_notes WHERE id = $1", [noteId])) as Record<string, unknown>[];
      return mapNoteRow(rows[0]);
    });
  }
  const db = getCrmSqlite();
  const prev = db.prepare("SELECT * FROM crm_notes WHERE id = ?").get(noteId) as Record<string, unknown> | undefined;
  if (!prev) return null;
  db.prepare(
    "INSERT INTO crm_note_revisions (id, note_id, editor_user_id, previous_body, revised_at) VALUES (?, ?, ?, ?, ?)",
  ).run(newId(), noteId, editorUserId, String(prev.body), ts);
  db.prepare("UPDATE crm_notes SET body = ?, updated_at = ? WHERE id = ?").run(body.trim(), ts, noteId);
  const row = db.prepare("SELECT * FROM crm_notes WHERE id = ?").get(noteId) as Record<string, unknown>;
  return mapNoteRow(row);
}

export async function listActivities(contactId: string, limit = 100): Promise<CrmActivity[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(
        "SELECT * FROM crm_activities WHERE contact_id = $1 ORDER BY occurred_at DESC LIMIT $2",
        [contactId, limit],
      )) as Record<string, unknown>[];
      return rows.map(mapActivityRow);
    });
  }
  const rows = getCrmSqlite()
    .prepare("SELECT * FROM crm_activities WHERE contact_id = ? ORDER BY occurred_at DESC LIMIT ?")
    .all(contactId, limit) as Record<string, unknown>[];
  return rows.map(mapActivityRow);
}

export async function listFollowUps(filter?: { status?: string }): Promise<CrmFollowUp[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(
        filter?.status
          ? "SELECT * FROM crm_follow_ups WHERE status = $1 ORDER BY due_at ASC"
          : "SELECT * FROM crm_follow_ups ORDER BY due_at ASC",
        filter?.status ? [filter.status] : [],
      )) as Record<string, unknown>[];
      return rows.map(mapFollowUpRow);
    });
  }
  const db = getCrmSqlite();
  const rows = filter?.status
    ? (db.prepare("SELECT * FROM crm_follow_ups WHERE status = ? ORDER BY due_at ASC").all(filter.status) as Record<
        string,
        unknown
      >[])
    : (db.prepare("SELECT * FROM crm_follow_ups ORDER BY due_at ASC").all() as Record<string, unknown>[]);
  return rows.map(mapFollowUpRow);
}

export async function createFollowUp(input: {
  contactId: string;
  title: string;
  description?: string;
  dueAt: string;
  priority?: CrmFollowUp["priority"];
  assignedOwnerId?: string | null;
  actorUserId: string;
}): Promise<CrmFollowUp> {
  const id = newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_follow_ups (id, contact_id, title, description, due_at, priority, status, assigned_owner_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)`,
        [id, input.contactId, input.title, input.description ?? null, input.dueAt, input.priority ?? "normal", input.assignedOwnerId ?? null, ts, ts],
      );
      await q("UPDATE crm_contacts SET next_follow_up_at = $2, updated_at = $3 WHERE id = $1", [input.contactId, input.dueAt, ts]);
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at) VALUES ($1,'follow_up_scheduled','crm',$2::jsonb,$3)`,
        [input.contactId, JSON.stringify({ followUpId: id, actorUserId: input.actorUserId }), ts],
      );
      const rows = (await q("SELECT * FROM crm_follow_ups WHERE id = $1", [id])) as Record<string, unknown>[];
      return mapFollowUpRow(rows[0]);
    });
  }
  const db = getCrmSqlite();
  db.prepare(
    `INSERT INTO crm_follow_ups (id, contact_id, title, description, due_at, priority, status, assigned_owner_id, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?, ?)`,
  ).run(id, input.contactId, input.title, input.description ?? null, input.dueAt, input.priority ?? "normal", input.assignedOwnerId ?? null, ts, ts);
  db.prepare("UPDATE crm_contacts SET next_follow_up_at = ?, updated_at = ? WHERE id = ?").run(input.dueAt, ts, input.contactId);
  sqliteRecordActivity(db, input.contactId, "follow_up_scheduled", { followUpId: id, actorUserId: input.actorUserId });
  return mapFollowUpRow(db.prepare("SELECT * FROM crm_follow_ups WHERE id = ?").get(id) as Record<string, unknown>);
}

export async function completeFollowUp(id: string, actorUserId: string): Promise<CrmFollowUp | null> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(
        "UPDATE crm_follow_ups SET status = 'completed', completed_at = $2, updated_at = $2 WHERE id = $1 RETURNING *",
        [id, ts],
      )) as Record<string, unknown>[];
      if (!rows[0]) return null;
      const followUp = mapFollowUpRow(rows[0]);
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at) VALUES ($1,'follow_up_completed','crm',$2::jsonb,$3)`,
        [followUp.contactId, JSON.stringify({ followUpId: id, actorUserId }), ts],
      );
      return followUp;
    });
  }
  const db = getCrmSqlite();
  const prev = db.prepare("SELECT * FROM crm_follow_ups WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!prev) return null;
  db.prepare("UPDATE crm_follow_ups SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?").run(ts, ts, id);
  sqliteRecordActivity(db, String(prev.contact_id), "follow_up_completed", { followUpId: id, actorUserId });
  return mapFollowUpRow(db.prepare("SELECT * FROM crm_follow_ups WHERE id = ?").get(id) as Record<string, unknown>);
}

export async function listEmails(contactId?: string, limit = 100): Promise<CrmEmailMessage[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = contactId
        ? ((await q("SELECT * FROM crm_email_messages WHERE contact_id = $1 ORDER BY sent_at DESC NULLS LAST LIMIT $2", [
            contactId,
            limit,
          ])) as Record<string, unknown>[])
        : ((await q("SELECT * FROM crm_email_messages ORDER BY sent_at DESC NULLS LAST LIMIT $1", [limit])) as Record<
            string,
            unknown
          >[]);
      return rows.map(mapEmailRow);
    });
  }
  const db = getCrmSqlite();
  const rows = contactId
    ? (db
        .prepare("SELECT * FROM crm_email_messages WHERE contact_id = ? ORDER BY sent_at DESC LIMIT ?")
        .all(contactId, limit) as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM crm_email_messages ORDER BY sent_at DESC LIMIT ?").all(limit) as Record<string, unknown>[]);
  return rows.map(mapEmailRow);
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => buildDashboardFromQuery(q));
  }
  return buildDashboardSqlite(getCrmSqlite());
}

async function buildDashboardFromQuery(q: (sql: string, params?: unknown[]) => Promise<unknown[]>): Promise<CrmDashboardMetrics> {
  const totalRows = (await q("SELECT COUNT(*)::int AS c FROM crm_contacts WHERE archived_at IS NULL")) as { c: number }[];
  const waitlistRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_contacts WHERE archived_at IS NULL AND classifications::text LIKE '%waitlist_candidate%'`,
  )) as { c: number }[];
  const prospectRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_contacts WHERE archived_at IS NULL AND pipeline_stage IN ('interested','qualified','contacted')`,
  )) as { c: number }[];
  const pilotRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_contacts WHERE archived_at IS NULL AND (classifications::text LIKE '%pilot_candidate%' OR pipeline_stage IN ('pilot_candidate','pilot_active'))`,
  )) as { c: number }[];
  const customerRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_contacts WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')`,
  )) as { c: number }[];
  const followDueRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_follow_ups WHERE status = 'pending' AND due_at <= now()`,
  )) as { c: number }[];
  const emailRows = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_email_messages WHERE sent_at >= now() - interval '30 days'`,
  )) as { c: number }[];
  const pipelineRows = (await q(
    `SELECT pipeline_stage AS stage, COUNT(*)::int AS count FROM crm_contacts WHERE archived_at IS NULL GROUP BY pipeline_stage`,
  )) as { stage: CrmPipelineStage; count: number }[];
  const activityRows = (await q("SELECT * FROM crm_activities ORDER BY occurred_at DESC LIMIT 12")) as Record<string, unknown>[];
  return {
    totalContacts: totalRows[0]?.c ?? 0,
    activeWaitlist: waitlistRows[0]?.c ?? 0,
    activeProspects: prospectRows[0]?.c ?? 0,
    pilotCandidates: pilotRows[0]?.c ?? 0,
    activeCustomers: customerRows[0]?.c ?? 0,
    followUpsDue: followDueRows[0]?.c ?? 0,
    emailsSentLast30Days: emailRows[0]?.c ?? 0,
    pipeline: pipelineRows.map((r) => ({ stage: r.stage, count: r.count })),
    recentActivity: activityRows.map(mapActivityRow),
    followUpBuckets: await followUpBucketsPg(q),
  };
}

async function followUpBucketsPg(q: (sql: string, params?: unknown[]) => Promise<unknown[]>): Promise<CrmDashboardMetrics["followUpBuckets"]> {
  const overdue = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_follow_ups WHERE status='pending' AND due_at < date_trunc('day', now())`,
  )) as { c: number }[];
  const today = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_follow_ups WHERE status='pending' AND due_at >= date_trunc('day', now()) AND due_at < date_trunc('day', now()) + interval '1 day'`,
  )) as { c: number }[];
  const week = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_follow_ups WHERE status='pending' AND due_at >= date_trunc('day', now()) AND due_at < date_trunc('day', now()) + interval '7 days'`,
  )) as { c: number }[];
  const completed = (await q(
    `SELECT COUNT(*)::int AS c FROM crm_follow_ups WHERE status='completed' AND completed_at >= now() - interval '7 days'`,
  )) as { c: number }[];
  return {
    overdue: overdue[0]?.c ?? 0,
    dueToday: today[0]?.c ?? 0,
    dueThisWeek: week[0]?.c ?? 0,
    completedRecently: completed[0]?.c ?? 0,
  };
}

function buildDashboardSqlite(db: Database.Database): CrmDashboardMetrics {
  const total = db.prepare("SELECT COUNT(*) AS c FROM crm_contacts WHERE archived_at IS NULL").get() as { c: number };
  const waitlist = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_contacts WHERE archived_at IS NULL AND classifications LIKE '%waitlist_candidate%'`)
    .get() as { c: number };
  const prospects = db
    .prepare(
      `SELECT COUNT(*) AS c FROM crm_contacts WHERE archived_at IS NULL AND pipeline_stage IN ('interested','qualified','contacted')`,
    )
    .get() as { c: number };
  const pilot = db
    .prepare(
      `SELECT COUNT(*) AS c FROM crm_contacts WHERE archived_at IS NULL AND (classifications LIKE '%pilot_candidate%' OR pipeline_stage IN ('pilot_candidate','pilot_active'))`,
    )
    .get() as { c: number };
  const customers = db
    .prepare(
      `SELECT COUNT(*) AS c FROM crm_contacts WHERE archived_at IS NULL AND (relationship_status = 'converted' OR pipeline_stage = 'converted')`,
    )
    .get() as { c: number };
  const followDue = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_follow_ups WHERE status = 'pending' AND due_at <= ?`)
    .get(nowIso()) as { c: number };
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const emails = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_email_messages WHERE sent_at IS NOT NULL AND sent_at >= ?`)
    .get(since) as { c: number };

  const pipelineRows = db
    .prepare(
      `SELECT pipeline_stage AS stage, COUNT(*) AS count FROM crm_contacts WHERE archived_at IS NULL GROUP BY pipeline_stage`,
    )
    .all() as { stage: CrmPipelineStage; count: number }[];

  const activityRows = db
    .prepare("SELECT * FROM crm_activities ORDER BY occurred_at DESC LIMIT 12")
    .all() as Record<string, unknown>[];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const endIso = endOfDay.toISOString();
  const weekEnd = new Date(startOfDay);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekIso = weekEnd.toISOString();
  const completedSince = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const overdue = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_follow_ups WHERE status='pending' AND due_at < ?`)
    .get(startIso) as { c: number };
  const dueToday = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_follow_ups WHERE status='pending' AND due_at >= ? AND due_at < ?`)
    .get(startIso, endIso) as { c: number };
  const dueWeek = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_follow_ups WHERE status='pending' AND due_at >= ? AND due_at < ?`)
    .get(startIso, weekIso) as { c: number };
  const completedRecent = db
    .prepare(`SELECT COUNT(*) AS c FROM crm_follow_ups WHERE status='completed' AND completed_at >= ?`)
    .get(completedSince) as { c: number };

  return {
    totalContacts: total.c,
    activeWaitlist: waitlist.c,
    activeProspects: prospects.c,
    pilotCandidates: pilot.c,
    activeCustomers: customers.c,
    followUpsDue: followDue.c,
    emailsSentLast30Days: emails.c,
    pipeline: pipelineRows.map((r) => ({ stage: r.stage, count: r.count })),
    recentActivity: activityRows.map(mapActivityRow),
    followUpBuckets: {
      overdue: overdue.c,
      dueToday: dueToday.c,
      dueThisWeek: dueWeek.c,
      completedRecently: completedRecent.c,
    },
  };
}

export async function mergeContacts(primaryId: string, secondaryId: string, actorUserId: string): Promise<CrmContact | null> {
  if (primaryId === secondaryId) return getContact(primaryId);
  const primary = await getContact(primaryId);
  const secondary = await getContact(secondaryId);
  if (!primary || !secondary) return null;

  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const ts = nowIso();
      const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
      const mergedClassifications = [...new Set([...primary.classifications, ...secondary.classifications])];
      const mergedEmails = [...new Set([...primary.additionalEmails, secondary.primaryEmail, ...secondary.additionalEmails])].filter(
        (e) => normalizeEmail(e) !== normalizeEmail(primary.primaryEmail),
      );
      await q(
        `UPDATE crm_contacts SET tags = $2::jsonb, classifications = $3::jsonb, additional_emails = $4::jsonb, updated_at = $5 WHERE id = $1`,
        [primaryId, JSON.stringify(mergedTags), JSON.stringify(mergedClassifications), JSON.stringify(mergedEmails), ts],
      );
      await q(`UPDATE crm_notes SET contact_id = $1 WHERE contact_id = $2`, [primaryId, secondaryId]);
      await q(`UPDATE crm_activities SET contact_id = $1 WHERE contact_id = $2`, [primaryId, secondaryId]);
      await q(`UPDATE crm_follow_ups SET contact_id = $1 WHERE contact_id = $2`, [primaryId, secondaryId]);
      await q(`UPDATE crm_email_messages SET contact_id = $1 WHERE contact_id = $2`, [primaryId, secondaryId]);
      await q(`UPDATE crm_contacts SET archived_at = $2, updated_at = $2 WHERE id = $1`, [secondaryId, ts]);
      await q(
        `INSERT INTO crm_activities (contact_id, event_type, source, payload, occurred_at) VALUES ($1,'merged','crm',$2::jsonb,$3)`,
        [primaryId, JSON.stringify({ mergedContactId: secondaryId, actorUserId }), ts],
      );
      return getContact(primaryId);
    });
  }

  const db = getCrmSqlite();
  const ts = nowIso();
  const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
  const mergedClassifications = [...new Set([...primary.classifications, ...secondary.classifications])];
  const mergedEmails = [...new Set([...primary.additionalEmails, secondary.primaryEmail, ...secondary.additionalEmails])].filter(
    (e) => normalizeEmail(e) !== normalizeEmail(primary.primaryEmail),
  );
  db.prepare(
    `UPDATE crm_contacts SET tags = ?, classifications = ?, additional_emails = ?, updated_at = ? WHERE id = ?`,
  ).run(JSON.stringify(mergedTags), JSON.stringify(mergedClassifications), JSON.stringify(mergedEmails), ts, primaryId);
  for (const table of ["crm_notes", "crm_activities", "crm_follow_ups", "crm_email_messages"]) {
    db.prepare(`UPDATE ${table} SET contact_id = ? WHERE contact_id = ?`).run(primaryId, secondaryId);
  }
  db.prepare("UPDATE crm_contacts SET archived_at = ?, updated_at = ? WHERE id = ?").run(ts, ts, secondaryId);
  sqliteRecordActivity(db, primaryId, "merged", { mergedContactId: secondaryId, actorUserId });
  return sqliteGetContact(db, primaryId);
}
