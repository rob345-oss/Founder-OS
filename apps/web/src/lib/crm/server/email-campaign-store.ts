import { parseBlocks, renderBlocksToHtml, renderBlocksToText } from "../email/blocks";
import { applyPersonalization, buildPersonalizationFromContact } from "../email/personalize";
import type {
  AudienceFilter,
  CommunicationType,
  CrmEmailCampaign,
  CrmEmailCampaignAnalytics,
  CrmEmailLabel,
  CrmEmailOverviewMetrics,
  CrmEmailSegment,
  CrmEmailTemplate,
  CrmEmailTemplateVersion,
  CrmEmailActivityItem,
  EmailBlock,
  EmailLocale,
} from "../email/types";
import { assertStagingRecipientAllowed } from "../email/staging-guard";
import { normalizeEmail } from "../normalize";
import { getCrmDriver, getCrmSqlite, newId, nowIso, withPgClient } from "./db";
import { previewCampaignAudience } from "./email-audience";
import { sendTransactionalEmailViaTg } from "./tg-email-send";

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

function jsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return (raw as T) ?? fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapLabel(row: Record<string, unknown>): CrmEmailLabel {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    color: String(row.color ?? "#5b8cff"),
    createdAt: String(row.created_at ?? row.createdAt),
    updatedAt: String(row.updated_at ?? row.updatedAt),
  };
}

function mapTemplate(row: Record<string, unknown>, labelIds: string[] = []): CrmEmailTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    locale: (String(row.locale ?? "en") === "es" ? "es" : "en") as EmailLocale,
    communicationType: String(row.communication_type ?? row.communicationType) === "transactional" ? "transactional" : "promotional",
    status: String(row.status) as CrmEmailTemplate["status"],
    fromName: String(row.from_name ?? row.fromName ?? "Titanium Guardian"),
    fromAddress: row.from_address != null ? String(row.from_address) : row.fromAddress != null ? String(row.fromAddress) : null,
    subjectDefault: String(row.subject_default ?? row.subjectDefault ?? ""),
    previewTextDefault: String(row.preview_text_default ?? row.previewTextDefault ?? ""),
    currentVersionId: row.current_version_id != null ? String(row.current_version_id) : row.currentVersionId != null ? String(row.currentVersionId) : null,
    labelIds,
    createdAt: String(row.created_at ?? row.createdAt),
    updatedAt: String(row.updated_at ?? row.updatedAt),
  };
}

function mapCampaign(row: Record<string, unknown>, labelIds: string[] = []): CrmEmailCampaign {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    internalNotes: String(row.internal_notes ?? row.internalNotes ?? ""),
    status: String(row.status) as CrmEmailCampaign["status"],
    communicationType: String(row.communication_type ?? row.communicationType) === "transactional" ? "transactional" : "promotional",
    templateId: row.template_id != null ? String(row.template_id) : null,
    templateVersionId: row.template_version_id != null ? String(row.template_version_id) : null,
    subject: String(row.subject ?? ""),
    previewText: String(row.preview_text ?? row.previewText ?? ""),
    fromName: String(row.from_name ?? "Titanium Guardian"),
    fromAddress: row.from_address != null ? String(row.from_address) : null,
    audienceFilter: jsonParse<AudienceFilter>(row.audience_filter ?? row.audienceFilter, {}),
    excludedContactIds: jsonParse<string[]>(row.excluded_contact_ids ?? row.excludedContactIds, []),
    estimatedRecipients: row.estimated_recipients != null ? Number(row.estimated_recipients) : null,
    scheduledAt: row.scheduled_at != null ? String(row.scheduled_at) : null,
    scheduledTimezone: String(row.scheduled_timezone ?? "UTC"),
    startedAt: row.started_at != null ? String(row.started_at) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    labelIds,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function labelIdsForCampaign(campaignId: string): Promise<string[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(`SELECT label_id FROM crm_email_campaign_labels WHERE campaign_id = $1`, [campaignId])) as {
        label_id: string;
      }[];
      return rows.map((r) => String(r.label_id));
    });
  }
  const rows = getCrmSqlite()
    .prepare(`SELECT label_id FROM crm_email_campaign_labels WHERE campaign_id = ?`)
    .all(campaignId) as { label_id: string }[];
  return rows.map((r) => r.label_id);
}

async function labelIdsForTemplate(templateId: string): Promise<string[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(`SELECT label_id FROM crm_email_template_labels WHERE template_id = $1`, [templateId])) as {
        label_id: string;
      }[];
      return rows.map((r) => String(r.label_id));
    });
  }
  const rows = getCrmSqlite()
    .prepare(`SELECT label_id FROM crm_email_template_labels WHERE template_id = ?`)
    .all(templateId) as { label_id: string }[];
  return rows.map((r) => r.label_id);
}

export async function writeEmailAuditLog(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const id = newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_email_audit_logs (id, actor_user_id, actor_email, action, entity_type, entity_id, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          id,
          input.actorUserId ?? null,
          input.actorEmail ?? null,
          input.action,
          input.entityType,
          input.entityId ?? null,
          JSON.stringify(input.details ?? {}),
          ts,
        ],
      );
    });
    return;
  }
  getCrmSqlite()
    .prepare(
      `INSERT INTO crm_email_audit_logs (id, actor_user_id, actor_email, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.actorUserId ?? null,
      input.actorEmail ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.details ?? {}),
      ts,
    );
}

export async function listEmailLabels(): Promise<CrmEmailLabel[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const rows = (await q(`SELECT * FROM crm_email_labels ORDER BY name`)) as Record<string, unknown>[];
      return rows.map(mapLabel);
    });
  }
  const rows = getCrmSqlite().prepare(`SELECT * FROM crm_email_labels ORDER BY name`).all() as Record<string, unknown>[];
  return rows.map(mapLabel);
}

export async function createEmailLabel(input: { name: string; color?: string }): Promise<CrmEmailLabel> {
  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      await q(`INSERT INTO crm_email_labels (id, slug, name, color, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
        id,
        slug,
        input.name.trim(),
        input.color ?? "#5b8cff",
        ts,
        ts,
      ]);
      const rows = (await q(`SELECT * FROM crm_email_labels WHERE id = $1`, [id])) as Record<string, unknown>[];
      return mapLabel(rows[0]);
    });
  }
  getCrmSqlite()
    .prepare(`INSERT INTO crm_email_labels (id, slug, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, slug, input.name.trim(), input.color ?? "#5b8cff", ts, ts);
  const row = getCrmSqlite().prepare(`SELECT * FROM crm_email_labels WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapLabel(row);
}

export async function listEmailTemplates(status?: string): Promise<CrmEmailTemplate[]> {
  const templates = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => {
        const rows = status
          ? ((await q(`SELECT * FROM crm_email_templates WHERE status = $1 ORDER BY updated_at DESC`, [status])) as Record<
              string,
              unknown
            >[])
          : ((await q(`SELECT * FROM crm_email_templates WHERE archived_at IS NULL ORDER BY updated_at DESC`)) as Record<
              string,
              unknown
            >[]);
        return rows;
      });
    }
    const rows = status
      ? (getCrmSqlite()
          .prepare(`SELECT * FROM crm_email_templates WHERE status = ? ORDER BY updated_at DESC`)
          .all(status) as Record<string, unknown>[])
      : (getCrmSqlite()
          .prepare(`SELECT * FROM crm_email_templates WHERE archived_at IS NULL ORDER BY updated_at DESC`)
          .all() as Record<string, unknown>[]);
    return rows;
  })();

  const out: CrmEmailTemplate[] = [];
  for (const row of templates) {
    out.push(mapTemplate(row, await labelIdsForTemplate(String(row.id))));
  }
  return out;
}

export async function getEmailTemplate(id: string): Promise<{ template: CrmEmailTemplate; version: CrmEmailTemplateVersion | null } | null> {
  const row = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => {
        const rows = (await q(`SELECT * FROM crm_email_templates WHERE id = $1`, [id])) as Record<string, unknown>[];
        return rows[0] ?? null;
      });
    }
    return (getCrmSqlite().prepare(`SELECT * FROM crm_email_templates WHERE id = ?`).get(id) as Record<string, unknown>) ?? null;
  })();
  if (!row) return null;
  const template = mapTemplate(row, await labelIdsForTemplate(id));
  let version: CrmEmailTemplateVersion | null = null;
  if (template.currentVersionId) {
    version = await getTemplateVersion(template.currentVersionId);
  }
  return { template, version };
}

export async function getTemplateVersion(id: string): Promise<CrmEmailTemplateVersion | null> {
  const row = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => {
        const rows = (await q(`SELECT * FROM crm_email_template_versions WHERE id = $1`, [id])) as Record<string, unknown>[];
        return rows[0] ?? null;
      });
    }
    return (getCrmSqlite().prepare(`SELECT * FROM crm_email_template_versions WHERE id = ?`).get(id) as Record<string, unknown>) ?? null;
  })();
  if (!row) return null;
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    versionNumber: Number(row.version_number),
    blocks: parseBlocks(jsonParse(row.blocks, [])),
    htmlBody: String(row.html_body ?? ""),
    textBody: String(row.text_body ?? ""),
    subject: String(row.subject ?? ""),
    previewText: String(row.preview_text ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function saveEmailTemplate(input: {
  id?: string;
  name: string;
  description?: string;
  locale: EmailLocale;
  communicationType: CommunicationType;
  fromName: string;
  fromAddress?: string | null;
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
  labelIds?: string[];
  actorUserId?: string;
}): Promise<{ template: CrmEmailTemplate; version: CrmEmailTemplateVersion }> {
  const ts = nowIso();
  const templateId = input.id ?? newId();
  const versionId = newId();
  const html = renderBlocksToHtml(input.blocks);
  const text = renderBlocksToText(input.blocks);

  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const existing = (await q(`SELECT id, version_number FROM crm_email_template_versions WHERE template_id = $1 ORDER BY version_number DESC LIMIT 1`, [
        templateId,
      ])) as { version_number: number }[];
      const versionNumber = (existing[0]?.version_number ?? 0) + 1;

      const templateRows = (await q(`SELECT id FROM crm_email_templates WHERE id = $1`, [templateId])) as { id: string }[];
      if (!templateRows[0]) {
        await q(
          `INSERT INTO crm_email_templates (id, name, description, locale, communication_type, status, from_name, from_address,
           subject_default, preview_text_default, current_version_id, created_by_user_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,NULL,$10,$11,$11)`,
          [
            templateId,
            input.name,
            input.description ?? "",
            input.locale,
            input.communicationType,
            input.fromName,
            input.fromAddress ?? null,
            input.subject,
            input.previewText,
            input.actorUserId ?? null,
            ts,
          ],
        );
      } else {
        await q(
          `UPDATE crm_email_templates SET name=$2, description=$3, locale=$4, communication_type=$5, from_name=$6, from_address=$7,
           subject_default=$8, preview_text_default=$9, updated_at=$10 WHERE id=$1`,
          [
            templateId,
            input.name,
            input.description ?? "",
            input.locale,
            input.communicationType,
            input.fromName,
            input.fromAddress ?? null,
            input.subject,
            input.previewText,
            ts,
          ],
        );
      }

      await q(
        `INSERT INTO crm_email_template_versions (id, template_id, version_number, blocks, html_body, text_body, subject, preview_text, created_by_user_id, created_at)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)`,
        [
          versionId,
          templateId,
          versionNumber,
          JSON.stringify(input.blocks),
          html,
          text,
          input.subject,
          input.previewText,
          input.actorUserId ?? null,
          ts,
        ],
      );

      await q(`UPDATE crm_email_templates SET current_version_id = $2, updated_at = $3 WHERE id = $1`, [templateId, versionId, ts]);

      if (input.labelIds) {
        await q(`DELETE FROM crm_email_template_labels WHERE template_id = $1`, [templateId]);
        for (const labelId of input.labelIds) {
          await q(`INSERT INTO crm_email_template_labels (template_id, label_id) VALUES ($1,$2)`, [templateId, labelId]);
        }
      }

      const tplRows = (await q(`SELECT * FROM crm_email_templates WHERE id = $1`, [templateId])) as Record<string, unknown>[];
      const ver = (await getTemplateVersion(versionId))!;
      return { template: mapTemplate(tplRows[0], input.labelIds ?? []), version: ver };
    });
  }

  const db = getCrmSqlite();
  const existingVer = db
    .prepare(`SELECT version_number FROM crm_email_template_versions WHERE template_id = ? ORDER BY version_number DESC LIMIT 1`)
    .get(templateId) as { version_number: number } | undefined;
  const versionNumber = (existingVer?.version_number ?? 0) + 1;

  const templateExists = db.prepare(`SELECT id FROM crm_email_templates WHERE id = ?`).get(templateId);
  if (!templateExists) {
    db.prepare(
      `INSERT INTO crm_email_templates (id, name, description, locale, communication_type, status, from_name, from_address,
       subject_default, preview_text_default, current_version_id, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, NULL, ?, ?, ?)`,
    ).run(
      templateId,
      input.name,
      input.description ?? "",
      input.locale,
      input.communicationType,
      input.fromName,
      input.fromAddress ?? null,
      input.subject,
      input.previewText,
      input.actorUserId ?? null,
      ts,
      ts,
    );
  } else {
    db.prepare(
      `UPDATE crm_email_templates SET name=?, description=?, locale=?, communication_type=?, from_name=?, from_address=?,
       subject_default=?, preview_text_default=?, updated_at=? WHERE id=?`,
    ).run(
      input.name,
      input.description ?? "",
      input.locale,
      input.communicationType,
      input.fromName,
      input.fromAddress ?? null,
      input.subject,
      input.previewText,
      ts,
      templateId,
    );
  }

  db.prepare(
    `INSERT INTO crm_email_template_versions (id, template_id, version_number, blocks, html_body, text_body, subject, preview_text, created_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    versionId,
    templateId,
    versionNumber,
    JSON.stringify(input.blocks),
    html,
    text,
    input.subject,
    input.previewText,
    input.actorUserId ?? null,
    ts,
  );

  db.prepare(`UPDATE crm_email_templates SET current_version_id = ?, updated_at = ? WHERE id = ?`).run(versionId, ts, templateId);

  if (input.labelIds) {
    db.prepare(`DELETE FROM crm_email_template_labels WHERE template_id = ?`).run(templateId);
    const insert = db.prepare(`INSERT INTO crm_email_template_labels (template_id, label_id) VALUES (?, ?)`);
    for (const labelId of input.labelIds) insert.run(templateId, labelId);
  }

  const tplRow = db.prepare(`SELECT * FROM crm_email_templates WHERE id = ?`).get(templateId) as Record<string, unknown>;
  const ver = (await getTemplateVersion(versionId))!;
  return { template: mapTemplate(tplRow, input.labelIds ?? []), version: ver };
}

export async function listEmailCampaigns(): Promise<CrmEmailCampaign[]> {
  const rows = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => q(`SELECT * FROM crm_email_campaigns ORDER BY updated_at DESC`)) as Promise<
        Record<string, unknown>[]
      >;
    }
    return getCrmSqlite().prepare(`SELECT * FROM crm_email_campaigns ORDER BY updated_at DESC`).all() as Record<string, unknown>[];
  })();
  const out: CrmEmailCampaign[] = [];
  for (const row of rows) {
    out.push(mapCampaign(row, await labelIdsForCampaign(String(row.id))));
  }
  return out;
}

export async function getEmailCampaign(id: string): Promise<CrmEmailCampaign | null> {
  const row = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => {
        const rows = (await q(`SELECT * FROM crm_email_campaigns WHERE id = $1`, [id])) as Record<string, unknown>[];
        return rows[0] ?? null;
      });
    }
    return (getCrmSqlite().prepare(`SELECT * FROM crm_email_campaigns WHERE id = ?`).get(id) as Record<string, unknown>) ?? null;
  })();
  if (!row) return null;
  return mapCampaign(row, await labelIdsForCampaign(id));
}

export async function saveEmailCampaign(input: {
  id?: string;
  name: string;
  description?: string;
  internalNotes?: string;
  communicationType: CommunicationType;
  templateId?: string | null;
  templateVersionId?: string | null;
  subject: string;
  previewText: string;
  fromName: string;
  fromAddress?: string | null;
  audienceFilter: AudienceFilter;
  excludedContactIds?: string[];
  labelIds?: string[];
  scheduledAt?: string | null;
  scheduledTimezone?: string;
  actorUserId?: string;
}): Promise<CrmEmailCampaign> {
  const ts = nowIso();
  const id = input.id ?? newId();
  const preview = await previewCampaignAudience({
    filter: input.audienceFilter,
    excludedContactIds: input.excludedContactIds ?? [],
    communicationType: input.communicationType,
  });

  const persist = async (q?: QueryFn) => {
    const params = [
      input.name,
      input.description ?? "",
      input.internalNotes ?? "",
      input.communicationType,
      input.templateId ?? null,
      input.templateVersionId ?? null,
      input.subject,
      input.previewText,
      input.fromName,
      input.fromAddress ?? null,
      JSON.stringify(input.audienceFilter),
      JSON.stringify(input.excludedContactIds ?? []),
      preview.totalEligible,
      input.scheduledAt ?? null,
      input.scheduledTimezone ?? "UTC",
      input.actorUserId ?? null,
      ts,
    ];

    if (q) {
      const rows = (await q(`SELECT id FROM crm_email_campaigns WHERE id = $1`, [id])) as { id: string }[];
      if (!rows[0]) {
        await q(
          `INSERT INTO crm_email_campaigns (id, name, description, internal_notes, status, communication_type, template_id,
           template_version_id, subject, preview_text, from_name, from_address, audience_filter, excluded_contact_ids,
           estimated_recipients, scheduled_at, scheduled_timezone, created_by_user_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$18)`,
          [id, ...params],
        );
      } else {
        await q(
          `UPDATE crm_email_campaigns SET name=$2, description=$3, internal_notes=$4, communication_type=$5, template_id=$6,
           template_version_id=$7, subject=$8, preview_text=$9, from_name=$10, from_address=$11, audience_filter=$12::jsonb,
           excluded_contact_ids=$13::jsonb, estimated_recipients=$14, scheduled_at=$15, scheduled_timezone=$16, updated_at=$17 WHERE id=$1`,
          [id, ...params.slice(0, -1)],
        );
      }
      if (input.labelIds) {
        await q(`DELETE FROM crm_email_campaign_labels WHERE campaign_id = $1`, [id]);
        for (const labelId of input.labelIds) {
          await q(`INSERT INTO crm_email_campaign_labels (campaign_id, label_id) VALUES ($1,$2)`, [id, labelId]);
        }
      }
      return;
    }

    const db = getCrmSqlite();
    const exists = db.prepare(`SELECT id FROM crm_email_campaigns WHERE id = ?`).get(id);
    if (!exists) {
      db.prepare(
        `INSERT INTO crm_email_campaigns (id, name, description, internal_notes, status, communication_type, template_id,
         template_version_id, subject, preview_text, from_name, from_address, audience_filter, excluded_contact_ids,
         estimated_recipients, scheduled_at, scheduled_timezone, created_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.name,
        input.description ?? "",
        input.internalNotes ?? "",
        input.communicationType,
        input.templateId ?? null,
        input.templateVersionId ?? null,
        input.subject,
        input.previewText,
        input.fromName,
        input.fromAddress ?? null,
        JSON.stringify(input.audienceFilter),
        JSON.stringify(input.excludedContactIds ?? []),
        preview.totalEligible,
        input.scheduledAt ?? null,
        input.scheduledTimezone ?? "UTC",
        input.actorUserId ?? null,
        ts,
        ts,
      );
    } else {
      db.prepare(
        `UPDATE crm_email_campaigns SET name=?, description=?, internal_notes=?, communication_type=?, template_id=?,
         template_version_id=?, subject=?, preview_text=?, from_name=?, from_address=?, audience_filter=?, excluded_contact_ids=?,
         estimated_recipients=?, scheduled_at=?, scheduled_timezone=?, updated_at=? WHERE id=?`,
      ).run(
        input.name,
        input.description ?? "",
        input.internalNotes ?? "",
        input.communicationType,
        input.templateId ?? null,
        input.templateVersionId ?? null,
        input.subject,
        input.previewText,
        input.fromName,
        input.fromAddress ?? null,
        JSON.stringify(input.audienceFilter),
        JSON.stringify(input.excludedContactIds ?? []),
        preview.totalEligible,
        input.scheduledAt ?? null,
        input.scheduledTimezone ?? "UTC",
        ts,
        id,
      );
    }
    if (input.labelIds) {
      db.prepare(`DELETE FROM crm_email_campaign_labels WHERE campaign_id = ?`).run(id);
      const ins = db.prepare(`INSERT INTO crm_email_campaign_labels (campaign_id, label_id) VALUES (?, ?)`);
      for (const labelId of input.labelIds) ins.run(id, labelId);
    }
  };

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => persist(q));
  } else {
    await persist();
  }

  return (await getEmailCampaign(id))!;
}

export async function scheduleEmailCampaign(campaignId: string, scheduledAt: string): Promise<CrmEmailCampaign> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(`UPDATE crm_email_campaigns SET status='scheduled', scheduled_at=$2, updated_at=$3 WHERE id=$1 AND status IN ('draft','scheduled')`, [
        campaignId,
        scheduledAt,
        ts,
      ]);
    });
  } else {
    getCrmSqlite()
      .prepare(`UPDATE crm_email_campaigns SET status='scheduled', scheduled_at=?, updated_at=? WHERE id=? AND status IN ('draft','scheduled')`)
      .run(scheduledAt, ts, campaignId);
  }
  return (await getEmailCampaign(campaignId))!;
}

export async function cancelEmailCampaign(campaignId: string): Promise<void> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(`UPDATE crm_email_campaigns SET status='cancelled', updated_at=$2 WHERE id=$1 AND status IN ('draft','scheduled')`, [
        campaignId,
        ts,
      ]);
      await q(`UPDATE crm_email_send_jobs SET status='cancelled', updated_at=$2 WHERE campaign_id=$1 AND status='pending'`, [
        campaignId,
        ts,
      ]);
    });
  } else {
    const db = getCrmSqlite();
    db.prepare(`UPDATE crm_email_campaigns SET status='cancelled', updated_at=? WHERE id=? AND status IN ('draft','scheduled')`).run(
      ts,
      campaignId,
    );
    db.prepare(`UPDATE crm_email_send_jobs SET status='cancelled', updated_at=? WHERE campaign_id=? AND status='pending'`).run(ts, campaignId);
  }
}

export async function materializeCampaignRecipients(campaignId: string): Promise<number> {
  const campaign = await getEmailCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const preview = await previewCampaignAudience({
    filter: campaign.audienceFilter,
    excludedContactIds: campaign.excludedContactIds,
    communicationType: campaign.communicationType,
  });
  const ts = nowIso();

  const insertOne = async (contact: (typeof preview.eligible)[number], q?: QueryFn) => {
    const id = newId();
    const personalization = buildPersonalizationFromContact({
      fullName: contact.fullName,
      organization: contact.organization,
      preferredLanguage: contact.preferredLanguage,
    });
    if (q) {
      await q(
        `INSERT INTO crm_email_campaign_recipients (id, campaign_id, contact_id, email_address, personalization, status, created_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,'pending',$6)
         ON CONFLICT (campaign_id, contact_id) DO UPDATE SET email_address=EXCLUDED.email_address, personalization=EXCLUDED.personalization`,
        [id, campaignId, contact.id, contact.primaryEmail, JSON.stringify(personalization), ts],
      );
      return;
    }
    getCrmSqlite()
      .prepare(
        `INSERT INTO crm_email_campaign_recipients (id, campaign_id, contact_id, email_address, personalization, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)
         ON CONFLICT (campaign_id, contact_id) DO UPDATE SET email_address=excluded.email_address, personalization=excluded.personalization`,
      )
      .run(id, campaignId, contact.id, contact.primaryEmail, JSON.stringify(personalization), ts);
  };

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      for (const c of preview.eligible) await insertOne(c, q);
    });
  } else {
    for (const c of preview.eligible) await insertOne(c);
  }
  return preview.totalEligible;
}

export async function enqueueCampaignSendJobs(campaignId: string, scheduledAt: string | null, isTest = false): Promise<number> {
  const campaign = await getEmailCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const version =
    campaign.templateVersionId != null ? await getTemplateVersion(campaign.templateVersionId) : null;
  if (!version) throw new Error("Campaign missing template version");

  await materializeCampaignRecipients(campaignId);
  const ts = nowIso();
  let created = 0;

  const recipients = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(
        async (q) =>
          (await q(`SELECT * FROM crm_email_campaign_recipients WHERE campaign_id = $1 AND status = 'pending'`, [campaignId])) as Record<
            string,
            unknown
          >[],
      );
    }
    return getCrmSqlite()
      .prepare(`SELECT * FROM crm_email_campaign_recipients WHERE campaign_id = ? AND status = 'pending'`)
      .all(campaignId) as Record<string, unknown>[];
  })();

  const createJob = async (row: Record<string, unknown>, q?: QueryFn) => {
    const recipientId = String(row.id);
    const contactId = String(row.contact_id);
    const to = String(row.email_address);
    const guard = assertStagingRecipientAllowed(to);
    if (!guard.ok && !isTest) {
      if (q) {
        await q(`UPDATE crm_email_campaign_recipients SET status='suppressed', skip_reason=$2 WHERE id=$1`, [recipientId, guard.reason]);
      } else {
        getCrmSqlite()
          .prepare(`UPDATE crm_email_campaign_recipients SET status='suppressed', skip_reason=? WHERE id=?`)
          .run(guard.reason, recipientId);
      }
      return;
    }

    const fields = jsonParse<Record<string, string>>(row.personalization, {});
    const subject = applyPersonalization(campaign.subject || version.subject, fields);
    const htmlTemplate = version.htmlBody;
    const textTemplate = version.textBody;
    const jobId = newId();
    const idempotencyKey = `campaign:${campaignId}:recipient:${recipientId}`;
    const payload = {
      html: applyPersonalization(htmlTemplate, fields, { html: true }),
      text: applyPersonalization(textTemplate, fields),
      previewText: campaign.previewText,
      fromName: campaign.fromName,
      fromAddress: campaign.fromAddress,
      campaignId,
      templateVersionId: version.id,
    };

    if (q) {
      await q(
        `INSERT INTO crm_email_send_jobs (id, campaign_id, campaign_recipient_id, contact_id, idempotency_key, to_address, subject,
         status, scheduled_at, is_test, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10::jsonb,$11,$11)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          jobId,
          campaignId,
          recipientId,
          contactId,
          idempotencyKey,
          to,
          subject,
          scheduledAt,
          isTest,
          JSON.stringify(payload),
          ts,
        ],
      );
    } else {
      getCrmSqlite()
        .prepare(
          `INSERT OR IGNORE INTO crm_email_send_jobs (id, campaign_id, campaign_recipient_id, contact_id, idempotency_key, to_address, subject,
         status, scheduled_at, is_test, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        )
        .run(
          jobId,
          campaignId,
          recipientId,
          contactId,
          idempotencyKey,
          to,
          subject,
          scheduledAt,
          isTest ? 1 : 0,
          JSON.stringify(payload),
          ts,
          ts,
        );
    }
    created += 1;
  };

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      for (const row of recipients) await createJob(row, q);
    });
  } else {
    for (const row of recipients) await createJob(row);
  }

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(`UPDATE crm_email_campaigns SET status='scheduled', scheduled_at=$2, updated_at=$3 WHERE id=$1`, [
        campaignId,
        scheduledAt,
        ts,
      ]);
    });
  } else {
    getCrmSqlite()
      .prepare(`UPDATE crm_email_campaigns SET status='scheduled', scheduled_at=?, updated_at=? WHERE id=?`)
      .run(scheduledAt, ts, campaignId);
  }

  return created;
}

export async function createTestSendJob(input: {
  campaignId: string;
  toAddress: string;
  bearer: string;
  actorUserId?: string;
}): Promise<{ jobId: string }> {
  const guard = assertStagingRecipientAllowed(input.toAddress);
  if (!guard.ok) throw new Error(guard.reason);

  const campaign = await getEmailCampaign(input.campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const version =
    campaign.templateVersionId != null ? await getTemplateVersion(campaign.templateVersionId) : null;
  if (!version) throw new Error("Template version required");

  const fields = { first_name: "Test", full_name: "Test Recipient", company_name: "Titanium Guardian" };
  const subject = applyPersonalization(campaign.subject || version.subject, fields);
  const jobId = newId();
  const ts = nowIso();
  const idempotencyKey = `test:${input.campaignId}:${normalizeEmail(input.toAddress)}:${ts}`;
  const payload = {
    html: applyPersonalization(version.htmlBody, fields, { html: true }),
    text: applyPersonalization(version.textBody, fields),
    fromName: campaign.fromName,
    fromAddress: campaign.fromAddress,
    isTest: true,
  };

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `INSERT INTO crm_email_send_jobs (id, campaign_id, idempotency_key, to_address, subject, status, scheduled_at, is_test, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'pending',NULL,true,$6::jsonb,$7,$7)`,
        [jobId, input.campaignId, idempotencyKey, input.toAddress, subject, JSON.stringify(payload), ts],
      );
    });
  } else {
    getCrmSqlite()
      .prepare(
        `INSERT INTO crm_email_send_jobs (id, campaign_id, idempotency_key, to_address, subject, status, scheduled_at, is_test, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NULL, 1, ?, ?, ?)`,
      )
      .run(jobId, input.campaignId, idempotencyKey, input.toAddress, subject, JSON.stringify(payload), ts, ts);
  }

  await dispatchDueSendJobs(input.bearer, 1);
  await writeEmailAuditLog({
    actorUserId: input.actorUserId,
    action: "test_send",
    entityType: "campaign",
    entityId: input.campaignId,
    details: { to: input.toAddress, jobId },
  });
  return { jobId };
}

export async function dispatchDueSendJobs(bearer: string, limit = 25): Promise<{ processed: number; sent: number; failed: number }> {
  const ts = nowIso();
  const jobs = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(
        async (q) =>
          (await q(
            `SELECT * FROM crm_email_send_jobs WHERE status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= $1)
             ORDER BY scheduled_at NULLS FIRST, created_at ASC LIMIT $2`,
            [ts, limit],
          )) as Record<string, unknown>[],
      );
    }
    return getCrmSqlite()
      .prepare(
        `SELECT * FROM crm_email_send_jobs WHERE status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= ?)
         ORDER BY scheduled_at IS NULL, scheduled_at ASC, created_at ASC LIMIT ?`,
      )
      .all(ts, limit) as Record<string, unknown>[];
  })();

  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    const jobId = String(job.id);
    const to = String(job.to_address);
    const subject = String(job.subject);
    const payload = jsonParse<{ html: string; text: string; fromName?: string; fromAddress?: string | null }>(job.payload, {
      html: "",
      text: "",
    });

    const stagingCheck = assertStagingRecipientAllowed(to);
    if (!stagingCheck.ok) {
      await markJobFailed(jobId, stagingCheck.reason);
      failed += 1;
      continue;
    }

    const idempotencyKey = String(job.idempotency_key);
    const result = await sendTransactionalEmailViaTg({
      bearer,
      toEmail: to,
      subject,
      bodyHtml: payload.html,
      bodyText: payload.text,
      idempotencyKey,
      fromName: payload.fromName,
      fromAddress: payload.fromAddress ?? undefined,
    });

    if (result.accepted) {
      await recordSentMessage(job, result.providerMessageId, ts);
      sent += 1;
    } else {
      await markJobFailed(jobId, result.error ?? "send_failed");
      failed += 1;
    }
  }

  return { processed: jobs.length, sent, failed };
}

async function markJobFailed(jobId: string, error: string): Promise<void> {
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `UPDATE crm_email_send_jobs SET status='failed', last_error=$2, attempt_count=attempt_count+1, updated_at=$3 WHERE id=$1`,
        [jobId, error, ts],
      );
    });
    return;
  }
  getCrmSqlite()
    .prepare(
      `UPDATE crm_email_send_jobs SET status='failed', last_error=?, attempt_count=attempt_count+1, updated_at=? WHERE id=?`,
    )
    .run(error, ts, jobId);
}

async function recordSentMessage(
  job: Record<string, unknown>,
  providerMessageId: string | undefined,
  ts: string,
): Promise<void> {
  const jobId = String(job.id);
  const msgId = newId();
  const campaignId = job.campaign_id != null ? String(job.campaign_id) : null;
  const contactId = job.contact_id != null ? String(job.contact_id) : null;
  const to = String(job.to_address);
  const subject = String(job.subject);
  const campaignKey = campaignId ? `crm:${campaignId}` : undefined;

  if (getCrmDriver() === "postgres") {
    await withPgClient(async (q) => {
      await q(
        `UPDATE crm_email_send_jobs SET status='sent', updated_at=$2, attempt_count=attempt_count+1 WHERE id=$1`,
        [jobId, ts],
      );
      await q(
        `INSERT INTO crm_email_messages (id, contact_id, provider, provider_message_id, direction, to_address, subject,
         campaign_key, campaign_id, send_job_id, delivery_status, sent_at, metadata, created_at)
         VALUES ($1,$2,'twilio_email',$3,'outbound',$4,$5,$6,$7,$8,'sent',$9,'{}'::jsonb,$9)`,
        [msgId, contactId, providerMessageId ?? null, to, subject, campaignKey ?? null, campaignId, jobId, ts],
      );
      if (campaignId) {
        await q(`UPDATE crm_email_campaign_recipients SET status='sent' WHERE id = $1`, [job.campaign_recipient_id ?? null]);
      }
    });
    return;
  }

  const db = getCrmSqlite();
  db.prepare(`UPDATE crm_email_send_jobs SET status='sent', updated_at=?, attempt_count=attempt_count+1 WHERE id=?`).run(ts, jobId);
  db.prepare(
    `INSERT INTO crm_email_messages (id, contact_id, provider, provider_message_id, direction, to_address, subject,
     campaign_key, campaign_id, send_job_id, delivery_status, sent_at, metadata, created_at)
     VALUES (?, ?, 'twilio_email', ?, 'outbound', ?, ?, ?, ?, ?, 'sent', ?, '{}', ?)`,
  ).run(
    msgId,
    contactId,
    providerMessageId ?? null,
    to,
    subject,
    campaignKey ?? null,
    campaignId,
    jobId,
    ts,
    ts,
  );
  if (job.campaign_recipient_id) {
    db.prepare(`UPDATE crm_email_campaign_recipients SET status='sent' WHERE id = ?`).run(String(job.campaign_recipient_id));
  }
}

export { addEmailSuppression, isEmailSuppressed } from "./email-suppressions";

export async function getEmailOverviewMetrics(periodDays = 30): Promise<CrmEmailOverviewMetrics> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const since = `now() - ($1::int * interval '1 day')`;
      const sentRows = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_messages WHERE COALESCE(sent_at, created_at) >= ${since}`,
        [periodDays],
      )) as { c: number }[];
      const delivered = (await q(
        `SELECT COUNT(DISTINCT message_id)::int AS c FROM crm_email_events WHERE event_type='delivered' AND occurred_at >= ${since}`,
        [periodDays],
      )) as { c: number }[];
      const uniqueOpens = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE event_type='opened' AND is_unique = true AND occurred_at >= ${since}`,
        [periodDays],
      )) as { c: number }[];
      const uniqueClicks = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE event_type='clicked' AND is_unique = true AND occurred_at >= ${since}`,
        [periodDays],
      )) as { c: number }[];
      const unsubs = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_suppressions WHERE created_at >= ${since}`,
        [periodDays],
      )) as { c: number }[];
      const scheduled = (await q(`SELECT COUNT(*)::int AS c FROM crm_email_campaigns WHERE status IN ('scheduled','sending')`)) as {
        c: number;
      }[];
      const automations = (await q(`SELECT COUNT(*)::int AS c FROM crm_email_automations WHERE status='active'`)) as { c: number }[];
      const sent = sentRows[0]?.c ?? 0;
      const deliveredCount = delivered[0]?.c ?? 0;
      return {
        emailsSent: sent,
        deliveryRate: sent > 0 ? deliveredCount / sent : null,
        openRateApprox: sent > 0 ? (uniqueOpens[0]?.c ?? 0) / sent : null,
        clickRate: sent > 0 ? (uniqueClicks[0]?.c ?? 0) / sent : null,
        unsubscribeRate: sent > 0 ? (unsubs[0]?.c ?? 0) / sent : null,
        scheduledCount: scheduled[0]?.c ?? 0,
        activeAutomations: automations[0]?.c ?? 0,
        periodDays,
      };
    });
  }

  const db = getCrmSqlite();
  const sent = (db.prepare(`SELECT COUNT(*) AS c FROM crm_email_messages WHERE sent_at >= datetime('now', ?)`).get(`-${periodDays} days`) as {
    c: number;
  }).c;
  const delivered = (
    db
      .prepare(`SELECT COUNT(DISTINCT message_id) AS c FROM crm_email_events WHERE event_type='delivered' AND occurred_at >= datetime('now', ?)`)
      .get(`-${periodDays} days`) as { c: number }
  ).c;
  const uniqueOpens = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM crm_email_events WHERE event_type='opened' AND is_unique = 1 AND occurred_at >= datetime('now', ?)`)
      .get(`-${periodDays} days`) as { c: number }
  ).c;
  const uniqueClicks = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM crm_email_events WHERE event_type='clicked' AND is_unique = 1 AND occurred_at >= datetime('now', ?)`)
      .get(`-${periodDays} days`) as { c: number }
  ).c;
  const unsubs = (
    db.prepare(`SELECT COUNT(*) AS c FROM crm_email_suppressions WHERE created_at >= datetime('now', ?)`).get(`-${periodDays} days`) as {
      c: number;
    }
  ).c;
  const scheduled = (db.prepare(`SELECT COUNT(*) AS c FROM crm_email_campaigns WHERE status IN ('scheduled','sending')`).get() as { c: number }).c;
  const automations = (db.prepare(`SELECT COUNT(*) AS c FROM crm_email_automations WHERE status='active'`).get() as { c: number }).c;

  return {
    emailsSent: sent,
    deliveryRate: sent > 0 ? delivered / sent : null,
    openRateApprox: sent > 0 ? uniqueOpens / sent : null,
    clickRate: sent > 0 ? uniqueClicks / sent : null,
    unsubscribeRate: sent > 0 ? unsubs / sent : null,
    scheduledCount: scheduled,
    activeAutomations: automations,
    periodDays,
  };
}

export async function getCampaignAnalytics(campaignId: string): Promise<CrmEmailCampaignAnalytics> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const sent = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_campaign_recipients WHERE campaign_id=$1 AND status IN ('sent','queued')`,
        [campaignId],
      )) as { c: number }[];
      const delivered = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='delivered'`,
        [campaignId],
      )) as { c: number }[];
      const failed = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_campaign_recipients WHERE campaign_id=$1 AND status='failed'`,
        [campaignId],
      )) as { c: number }[];
      const bounced = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='bounced'`,
        [campaignId],
      )) as { c: number }[];
      const uniqueOpens = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='opened' AND is_unique=true`,
        [campaignId],
      )) as { c: number }[];
      const uniqueClicks = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='clicked' AND is_unique=true`,
        [campaignId],
      )) as { c: number }[];
      const totalOpens = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='opened'`,
        [campaignId],
      )) as { c: number }[];
      const totalClicks = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_events WHERE campaign_id=$1 AND event_type='clicked'`,
        [campaignId],
      )) as { c: number }[];
      const unsubs = (await q(
        `SELECT COUNT(*)::int AS c FROM crm_email_suppressions WHERE source_campaign_id=$1`,
        [campaignId],
      )) as { c: number }[];
      return {
        campaignId,
        sent: sent[0]?.c ?? 0,
        delivered: delivered[0]?.c ?? 0,
        failed: failed[0]?.c ?? 0,
        bounced: bounced[0]?.c ?? 0,
        uniqueOpens: uniqueOpens[0]?.c ?? 0,
        uniqueClicks: uniqueClicks[0]?.c ?? 0,
        unsubscribes: unsubs[0]?.c ?? 0,
        totalOpens: totalOpens[0]?.c ?? 0,
        totalClicks: totalClicks[0]?.c ?? 0,
        opensAreApproximate: true,
      };
    });
  }

  const db = getCrmSqlite();
  const count = (sql: string) => (db.prepare(sql).get(campaignId) as { c: number }).c;
  return {
    campaignId,
    sent: count(`SELECT COUNT(*) AS c FROM crm_email_campaign_recipients WHERE campaign_id=? AND status IN ('sent','queued')`),
    delivered: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='delivered'`),
    failed: count(`SELECT COUNT(*) AS c FROM crm_email_campaign_recipients WHERE campaign_id=? AND status='failed'`),
    bounced: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='bounced'`),
    uniqueOpens: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='opened' AND is_unique=1`),
    uniqueClicks: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='clicked' AND is_unique=1`),
    unsubscribes: count(`SELECT COUNT(*) AS c FROM crm_email_suppressions WHERE source_campaign_id=?`),
    totalOpens: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='opened'`),
    totalClicks: count(`SELECT COUNT(*) AS c FROM crm_email_events WHERE campaign_id=? AND event_type='clicked'`),
    opensAreApproximate: true,
  };
}

export async function getContactEmailActivity(contactId: string): Promise<CrmEmailActivityItem[]> {
  const items: CrmEmailActivityItem[] = [];
  const pushEvents = async () => {
    const rows = await (async () => {
      if (getCrmDriver() === "postgres") {
        return withPgClient(
          async (q) =>
            (await q(`SELECT e.*, c.name AS campaign_name FROM crm_email_events e
              LEFT JOIN crm_email_campaigns c ON c.id = e.campaign_id
              WHERE e.contact_id = $1 ORDER BY e.occurred_at DESC LIMIT 100`, [contactId])) as Record<string, unknown>[],
        );
      }
      return getCrmSqlite()
        .prepare(
          `SELECT e.*, c.name AS campaign_name FROM crm_email_events e
           LEFT JOIN crm_email_campaigns c ON c.id = e.campaign_id
           WHERE e.contact_id = ? ORDER BY e.occurred_at DESC LIMIT 100`,
        )
        .all(contactId) as Record<string, unknown>[];
    })();
    for (const row of rows) {
      items.push({
        id: String(row.id),
        eventType: String(row.event_type),
        occurredAt: String(row.occurred_at),
        campaignId: row.campaign_id != null ? String(row.campaign_id) : null,
        campaignName: row.campaign_name != null ? String(row.campaign_name) : null,
        messageId: row.message_id != null ? String(row.message_id) : null,
        metadata: jsonParse(row.metadata, {}),
        source: "event",
      });
    }
  };

  const pushMessages = async () => {
    const rows = await (async () => {
      if (getCrmDriver() === "postgres") {
        return withPgClient(
          async (q) => (await q(`SELECT * FROM crm_email_messages WHERE contact_id = $1 ORDER BY sent_at DESC NULLS LAST LIMIT 50`, [contactId])) as Record<
            string,
            unknown
          >[],
        );
      }
      return getCrmSqlite()
        .prepare(`SELECT * FROM crm_email_messages WHERE contact_id = ? ORDER BY sent_at DESC LIMIT 50`)
        .all(contactId) as Record<string, unknown>[];
    })();
    for (const row of rows) {
      items.push({
        id: String(row.id),
        eventType: `message_${String(row.delivery_status)}`,
        occurredAt: String(row.sent_at ?? row.created_at),
        campaignId: row.campaign_id != null ? String(row.campaign_id) : null,
        campaignName: null,
        messageId: String(row.id),
        metadata: { subject: row.subject, to: row.to_address },
        source: "message",
      });
    }
  };

  await pushEvents();
  await pushMessages();
  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return items.slice(0, 100);
}

export async function saveEmailSegment(input: {
  id?: string;
  name: string;
  description?: string;
  filter: AudienceFilter;
  actorUserId?: string;
}): Promise<CrmEmailSegment> {
  const id = input.id ?? newId();
  const ts = nowIso();
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => {
      const exists = (await q(`SELECT id FROM crm_email_segments WHERE id = $1`, [id])) as { id: string }[];
      if (!exists[0]) {
        await q(
          `INSERT INTO crm_email_segments (id, name, description, filter, created_by_user_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6,$6)`,
          [id, input.name, input.description ?? "", JSON.stringify(input.filter), input.actorUserId ?? null, ts],
        );
      } else {
        await q(`UPDATE crm_email_segments SET name=$2, description=$3, filter=$4::jsonb, updated_at=$5 WHERE id=$1`, [
          id,
          input.name,
          input.description ?? "",
          JSON.stringify(input.filter),
          ts,
        ]);
      }
      const rows = (await q(`SELECT * FROM crm_email_segments WHERE id = $1`, [id])) as Record<string, unknown>[];
      const row = rows[0];
      return {
        id,
        name: String(row.name),
        description: String(row.description ?? ""),
        filter: jsonParse(row.filter, {}),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });
  }

  const db = getCrmSqlite();
  if (!db.prepare(`SELECT id FROM crm_email_segments WHERE id = ?`).get(id)) {
    db.prepare(
      `INSERT INTO crm_email_segments (id, name, description, filter, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.name, input.description ?? "", JSON.stringify(input.filter), input.actorUserId ?? null, ts, ts);
  } else {
    db.prepare(`UPDATE crm_email_segments SET name=?, description=?, filter=?, updated_at=? WHERE id=?`).run(
      input.name,
      input.description ?? "",
      JSON.stringify(input.filter),
      ts,
      id,
    );
  }
  const row = db.prepare(`SELECT * FROM crm_email_segments WHERE id = ?`).get(id) as Record<string, unknown>;
  return {
    id,
    name: String(row.name),
    description: String(row.description ?? ""),
    filter: jsonParse(row.filter, {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listEmailSegments(): Promise<CrmEmailSegment[]> {
  const rows = await (async () => {
    if (getCrmDriver() === "postgres") {
      return withPgClient(async (q) => q(`SELECT * FROM crm_email_segments ORDER BY updated_at DESC`)) as Promise<Record<string, unknown>[]>;
    }
    return getCrmSqlite().prepare(`SELECT * FROM crm_email_segments ORDER BY updated_at DESC`).all() as Record<string, unknown>[];
  })();
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    filter: jsonParse(row.filter, {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}