import type Database from "better-sqlite3";

import type {
  MarketingCampaign,
  MarketingContentItem,
  MarketingGoal,
  MarketingSettings,
} from "../types";
import { getMarketingDriver, getMarketingSqlite, newId, nowIso, withMarketingPgClient } from "./db";

function mapCampaign(row: Record<string, unknown>): MarketingCampaign {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    objective: row.objective != null ? String(row.objective) : null,
    channel: row.channel != null ? String(row.channel) : null,
    startDate: row.start_date != null ? String(row.start_date) : null,
    endDate: row.end_date != null ? String(row.end_date) : null,
    status: String(row.status) as MarketingCampaign["status"],
    plannedBudget: row.planned_budget != null ? Number(row.planned_budget) : null,
    actualSpend: row.actual_spend != null ? Number(row.actual_spend) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGoal(row: Record<string, unknown>): MarketingGoal {
  return {
    id: String(row.id),
    title: String(row.title),
    metricKey: String(row.metric_key),
    targetValue: Number(row.target_value),
    deadline: row.deadline != null ? String(row.deadline) : null,
    status: String(row.status) as MarketingGoal["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapContent(row: Record<string, unknown>): MarketingContentItem {
  return {
    id: String(row.id),
    title: String(row.title),
    contentType: row.content_type != null ? String(row.content_type) : null,
    platform: row.platform != null ? String(row.platform) : null,
    hook: row.hook != null ? String(row.hook) : null,
    cta: row.cta != null ? String(row.cta) : null,
    status: String(row.status) as MarketingContentItem["status"],
    publishDate: row.publish_date != null ? String(row.publish_date) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listCampaigns(): Promise<MarketingCampaign[]> {
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_campaigns ORDER BY updated_at DESC")) as Record<string, unknown>[];
      return rows.map(mapCampaign);
    });
  }
  const db = getMarketingSqlite();
  return (db.prepare("SELECT * FROM marketing_campaigns ORDER BY updated_at DESC").all() as Record<string, unknown>[]).map(
    mapCampaign,
  );
}

export async function createCampaign(input: Partial<MarketingCampaign> & { name: string }): Promise<MarketingCampaign> {
  const ts = nowIso();
  const row = {
    id: newId(),
    name: input.name.trim(),
    description: input.description ?? null,
    objective: input.objective ?? null,
    channel: input.channel ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    status: input.status ?? "draft",
    planned_budget: input.plannedBudget ?? null,
    actual_spend: input.actualSpend ?? null,
    created_at: ts,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_campaigns
         (id, name, description, objective, channel, start_date, end_date, status, planned_budget, actual_spend, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.id,
          row.name,
          row.description,
          row.objective,
          row.channel,
          row.start_date,
          row.end_date,
          row.status,
          row.planned_budget,
          row.actual_spend,
          row.created_at,
          row.updated_at,
        ],
      );
      return mapCampaign(row);
    });
  }

  const db = getMarketingSqlite();
  db.prepare(
    `INSERT INTO marketing_campaigns
     (id, name, description, objective, channel, start_date, end_date, status, planned_budget, actual_spend, created_at, updated_at)
     VALUES (@id, @name, @description, @objective, @channel, @start_date, @end_date, @status, @planned_budget, @actual_spend, @created_at, @updated_at)`,
  ).run(row);
  return mapCampaign(row);
}

export async function listGoals(): Promise<MarketingGoal[]> {
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_goals ORDER BY deadline NULLS LAST, updated_at DESC")) as Record<
        string,
        unknown
      >[];
      return rows.map(mapGoal);
    });
  }
  const db = getMarketingSqlite();
  return (db.prepare("SELECT * FROM marketing_goals ORDER BY deadline ASC, updated_at DESC").all() as Record<string, unknown>[]).map(
    mapGoal,
  );
}

export async function createGoal(input: Partial<MarketingGoal> & { title: string; metricKey: string; targetValue: number }): Promise<MarketingGoal> {
  const ts = nowIso();
  const row = {
    id: newId(),
    title: input.title.trim(),
    metric_key: input.metricKey,
    target_value: input.targetValue,
    deadline: input.deadline ?? null,
    status: input.status ?? "planned",
    created_at: ts,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_goals (id, title, metric_key, target_value, deadline, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row.id, row.title, row.metric_key, row.target_value, row.deadline, row.status, row.created_at, row.updated_at],
      );
      return mapGoal(row);
    });
  }

  const db = getMarketingSqlite();
  db.prepare(
    `INSERT INTO marketing_goals (id, title, metric_key, target_value, deadline, status, created_at, updated_at)
     VALUES (@id, @title, @metric_key, @target_value, @deadline, @status, @created_at, @updated_at)`,
  ).run(row);
  return mapGoal(row);
}

export async function listContentItems(): Promise<MarketingContentItem[]> {
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_content_items ORDER BY updated_at DESC")) as Record<string, unknown>[];
      return rows.map(mapContent);
    });
  }
  const db = getMarketingSqlite();
  return (db.prepare("SELECT * FROM marketing_content_items ORDER BY updated_at DESC").all() as Record<string, unknown>[]).map(
    mapContent,
  );
}

export async function createContentItem(
  input: Partial<MarketingContentItem> & { title: string },
): Promise<MarketingContentItem> {
  const ts = nowIso();
  const row = {
    id: newId(),
    title: input.title.trim(),
    content_type: input.contentType ?? null,
    platform: input.platform ?? null,
    hook: input.hook ?? null,
    cta: input.cta ?? null,
    status: input.status ?? "idea",
    publish_date: input.publishDate ?? null,
    notes: input.notes ?? null,
    created_at: ts,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_content_items
         (id, title, content_type, platform, hook, cta, status, publish_date, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          row.id,
          row.title,
          row.content_type,
          row.platform,
          row.hook,
          row.cta,
          row.status,
          row.publish_date,
          row.notes,
          row.created_at,
          row.updated_at,
        ],
      );
      return mapContent(row);
    });
  }

  const db = getMarketingSqlite();
  db.prepare(
    `INSERT INTO marketing_content_items
     (id, title, content_type, platform, hook, cta, status, publish_date, notes, created_at, updated_at)
     VALUES (@id, @title, @content_type, @platform, @hook, @cta, @status, @publish_date, @notes, @created_at, @updated_at)`,
  ).run(row);
  return mapContent(row);
}

export async function countOverdueScheduledContent(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q(
        `SELECT COUNT(*)::int AS c FROM marketing_content_items
         WHERE status = 'scheduled' AND publish_date IS NOT NULL AND publish_date < $1::date`,
        [today],
      )) as { c: number }[];
      return rows[0]?.c ?? 0;
    });
  }
  const db = getMarketingSqlite();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM marketing_content_items
       WHERE status = 'scheduled' AND publish_date IS NOT NULL AND publish_date < ?`,
    )
    .get(today) as { c: number };
  return row?.c ?? 0;
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_settings WHERE id = 'default'")) as Record<string, unknown>[];
      const row = rows[0];
      if (!row) {
        return {
          defaultDateRange: "30d",
          timezone: "Europe/Madrid",
          qualifiedLeadStages: ["qualified", "pilot_candidate", "pilot_active", "converted"],
          dataRefreshNote: null,
        };
      }
      return {
        defaultDateRange: String(row.default_date_range) as MarketingSettings["defaultDateRange"],
        timezone: String(row.timezone),
        qualifiedLeadStages: JSON.parse(String(row.qualified_lead_stages || "[]")) as string[],
        dataRefreshNote: row.data_refresh_note != null ? String(row.data_refresh_note) : null,
      };
    });
  }
  const db = getMarketingSqlite();
  const row = db.prepare("SELECT * FROM marketing_settings WHERE id = 'default'").get() as Record<string, unknown>;
  return {
    defaultDateRange: String(row.default_date_range) as MarketingSettings["defaultDateRange"],
    timezone: String(row.timezone),
    qualifiedLeadStages: JSON.parse(String(row.qualified_lead_stages || "[]")) as string[],
    dataRefreshNote: row.data_refresh_note != null ? String(row.data_refresh_note) : null,
  };
}

export async function topPublishedContent(limit = 5) {
  const items = await listContentItems();
  return items
    .filter((c) => c.status === "published")
    .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""))
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform ?? "—",
      format: c.contentType ?? "—",
      publishedAt: c.publishDate,
      reach: null,
      engagementRate: null,
      clicks: null,
      attributedSignups: null,
    }));
}
