import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_STATUS_TRANSITIONS,
  type SocialAccount,
  type SocialConnectionState,
  type SocialManualMetricsInput,
  type SocialPlatformId,
  type SocialPost,
  type SocialPostInput,
  type SocialPostMetrics,
  type SocialPostStatus,
  type SocialPostWithMetrics,
} from "../social-types";
import { collectMarketingSocialIntegrations } from "./social-platforms";
import { metricsEngagements, sumEngagements } from "./social-metrics";
import { getMarketingDriver, getMarketingSqlite, newId, nowIso, withMarketingPgClient } from "./db";
import { isMarketingPublishArmed } from "./publish-guard";

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

function mapAccount(row: Record<string, unknown>): SocialAccount {
  return {
    id: String(row.id),
    platform: String(row.platform) as SocialPlatformId,
    accountLabel: row.account_label != null ? String(row.account_label) : null,
    externalAccountId: row.external_account_id != null ? String(row.external_account_id) : null,
    connectionState: String(row.connection_state) as SocialConnectionState,
    capabilities: parseJsonArray(row.capabilities),
    lastSyncAt: row.last_sync_at != null ? String(row.last_sync_at) : null,
    healthNote: row.health_note != null ? String(row.health_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPost(row: Record<string, unknown>): SocialPost {
  return {
    id: String(row.id),
    internalLabel: row.internal_label != null ? String(row.internal_label) : null,
    bodyText: String(row.body_text ?? ""),
    platform: String(row.platform) as SocialPlatformId,
    campaignId: row.campaign_id != null ? String(row.campaign_id) : null,
    status: String(row.status) as SocialPostStatus,
    scheduledAt: row.scheduled_at != null ? String(row.scheduled_at) : null,
    publishedAt: row.published_at != null ? String(row.published_at) : null,
    platformPermalink: row.platform_permalink != null ? String(row.platform_permalink) : null,
    destinationUrl: row.destination_url != null ? String(row.destination_url) : null,
    ctaText: row.cta_text != null ? String(row.cta_text) : null,
    hashtags: row.hashtags != null ? String(row.hashtags) : null,
    topicTags: parseJsonArray(row.topic_tags),
    mediaRefs: parseJsonArray(row.media_refs),
    externalPublishState: String(row.external_publish_state) as SocialPost["externalPublishState"],
    publishError: row.publish_error != null ? String(row.publish_error) : null,
    isManualTrackOnly: Boolean(row.is_manual_track_only),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMetrics(row: Record<string, unknown>): SocialPostMetrics {
  const num = (k: string) => (row[k] != null ? Number(row[k]) : null);
  return {
    id: String(row.id),
    postId: String(row.post_id),
    source: String(row.source) as SocialPostMetrics["source"],
    providerSnapshotId: row.provider_snapshot_id != null ? String(row.provider_snapshot_id) : null,
    periodStart: row.period_start != null ? String(row.period_start) : null,
    periodEnd: row.period_end != null ? String(row.period_end) : null,
    impressions: num("impressions"),
    reach: num("reach"),
    engagements: num("engagements"),
    likes: num("likes"),
    comments: num("comments"),
    shares: num("shares"),
    saves: num("saves"),
    clicks: num("clicks"),
    videoViews: num("video_views"),
    watchTimeSec: num("watch_time_sec"),
    profileVisits: num("profile_visits"),
    websiteClicks: num("website_clicks"),
    followersGained: num("followers_gained"),
    recordedAt: String(row.recorded_at),
    syncedAt: row.synced_at != null ? String(row.synced_at) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
  };
}

function attachMetrics(post: SocialPost, metrics: SocialPostMetrics[]): SocialPostWithMetrics {
  const manual = metrics.filter((m) => m.source === "manual").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const provider =
    metrics.filter((m) => m.source === "provider").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const display = manual ?? provider;
  const engagements = display ? metricsEngagements(display) : 0;
  const rate =
    display?.impressions != null && display.impressions > 0 ? (engagements / display.impressions) * 100 : null;
  return {
    ...post,
    latestManualMetrics: manual,
    latestProviderMetrics: provider,
    engagementRate: rate,
  };
}

export function assertSocialStatusTransition(from: SocialPostStatus, to: SocialPostStatus): void {
  if (from === to) return;
  const allowed = SOCIAL_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}

async function loadLatestMetricsForPosts(postIds: string[]): Promise<Map<string, SocialPostMetrics[]>> {
  if (!postIds.length) return new Map();
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q(
        `SELECT DISTINCT ON (post_id, source) *
         FROM marketing_social_post_metrics
         WHERE post_id = ANY($1::uuid[])
         ORDER BY post_id, source, recorded_at DESC`,
        [postIds],
      )) as Record<string, unknown>[];
      const map = new Map<string, SocialPostMetrics[]>();
      for (const row of rows) {
        const m = mapMetrics(row);
        const list = map.get(m.postId) ?? [];
        list.push(m);
        map.set(m.postId, list);
      }
      return map;
    });
  }
  const db = getMarketingSqlite();
  const map = new Map<string, SocialPostMetrics[]>();
  const stmt = db.prepare(
    `SELECT m.* FROM marketing_social_post_metrics m
     INNER JOIN (
       SELECT post_id, source, MAX(recorded_at) AS max_rec
       FROM marketing_social_post_metrics
       WHERE post_id = ?
       GROUP BY post_id, source
     ) latest ON latest.post_id = m.post_id AND latest.source = m.source AND latest.max_rec = m.recorded_at
     WHERE m.post_id = ?`,
  );
  for (const id of postIds) {
    const rows = stmt.all(id, id) as Record<string, unknown>[];
    map.set(id, rows.map(mapMetrics));
  }
  return map;
}

export async function ensureSocialAccountStubs(): Promise<void> {
  const integrations = collectMarketingSocialIntegrations();
  const known = new Set(integrations.map((i) => i.platform));
  for (const platform of SOCIAL_PLATFORMS) {
    if (platform === "youtube" || platform === "tiktok" || platform === "x") {
      // stubs for platforms without env probe yet
    }
    const state: SocialConnectionState = known.has(platform as "instagram" | "facebook" | "linkedin")
      ? integrations.find((i) => i.platform === platform)?.state === "connected"
        ? "connected"
        : "not_connected"
      : "not_connected";

    if (getMarketingDriver() === "postgres") {
      await withMarketingPgClient(async (q) => {
        await q(
          `INSERT INTO marketing_social_accounts (id, platform, account_label, connection_state, capabilities, created_at, updated_at)
           SELECT gen_random_uuid(), $1, $2, $3, '[]'::jsonb, now(), now()
           WHERE NOT EXISTS (SELECT 1 FROM marketing_social_accounts WHERE platform = $1 AND external_account_id IS NULL)`,
          [platform, SOCIAL_PLATFORM_LABELS[platform], state === "connected" ? "connected" : "not_connected"],
        );
      });
    } else {
      const db = getMarketingSqlite();
      const existing = db
        .prepare("SELECT id FROM marketing_social_accounts WHERE platform = ? AND external_account_id IS NULL")
        .get(platform);
      if (!existing) {
        const ts = nowIso();
        db.prepare(
          `INSERT INTO marketing_social_accounts
          (id, platform, account_label, external_account_id, connection_state, capabilities, created_at, updated_at)
          VALUES (?, ?, ?, NULL, ?, '[]', ?, ?)`,
        ).run(newId(), platform, SOCIAL_PLATFORM_LABELS[platform], state === "connected" ? "connected" : "not_connected", ts, ts);
      }
    }
  }
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  await ensureSocialAccountStubs();
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_social_accounts ORDER BY platform")) as Record<string, unknown>[];
      return rows.map(mapAccount);
    });
  }
  const db = getMarketingSqlite();
  return (db.prepare("SELECT * FROM marketing_social_accounts ORDER BY platform").all() as Record<string, unknown>[]).map(
    mapAccount,
  );
}

export type SocialPostListQuery = {
  platform?: SocialPlatformId;
  status?: SocialPostStatus | SocialPostStatus[];
  campaignId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listSocialPosts(query: SocialPostListQuery = {}): Promise<SocialPostWithMetrics[]> {
  const limit = Math.min(query.limit ?? 200, 500);
  const offset = query.offset ?? 0;
  const statuses = query.status ? (Array.isArray(query.status) ? query.status : [query.status]) : null;

  let rows: Record<string, unknown>[];
  if (getMarketingDriver() === "postgres") {
    rows = await withMarketingPgClient(async (q) => {
      const clauses: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (query.platform) {
        clauses.push(`platform = $${idx++}`);
        params.push(query.platform);
      }
      if (statuses?.length) {
        clauses.push(`status = ANY($${idx++}::text[])`);
        params.push(statuses);
      }
      if (query.campaignId) {
        clauses.push(`campaign_id = $${idx++}`);
        params.push(query.campaignId);
      }
      if (query.search?.trim()) {
        clauses.push(`(body_text ILIKE $${idx} OR internal_label ILIKE $${idx})`);
        params.push(`%${query.search.trim()}%`);
        idx++;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit, offset);
      return (await q(
        `SELECT * FROM marketing_social_posts ${where}
         ORDER BY COALESCE(published_at, scheduled_at, created_at) DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        params,
      )) as Record<string, unknown>[];
    });
  } else {
    const db = getMarketingSqlite();
    const clauses: string[] = [];
    const params: Record<string, unknown> = { limit, offset };
    if (query.platform) {
      clauses.push("platform = @platform");
      params.platform = query.platform;
    }
    if (statuses?.length) {
      clauses.push(`status IN (${statuses.map((_, i) => `@st${i}`).join(",")})`);
      statuses.forEach((s, i) => {
        params[`st${i}`] = s;
      });
    }
    if (query.campaignId) {
      clauses.push("campaign_id = @campaignId");
      params.campaignId = query.campaignId;
    }
    if (query.search?.trim()) {
      clauses.push("(body_text LIKE @search OR internal_label LIKE @search)");
      params.search = `%${query.search.trim()}%`;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    rows = db
      .prepare(
        `SELECT * FROM marketing_social_posts ${where}
         ORDER BY COALESCE(published_at, scheduled_at, created_at) DESC
         LIMIT @limit OFFSET @offset`,
      )
      .all(params) as Record<string, unknown>[];
  }

  const posts = rows.map(mapPost);
  const metricsMap = await loadLatestMetricsForPosts(posts.map((p) => p.id));
  return posts.map((p) => attachMetrics(p, metricsMap.get(p.id) ?? []));
}

export async function getSocialPost(id: string): Promise<SocialPostWithMetrics | null> {
  let row: Record<string, unknown> | undefined;
  if (getMarketingDriver() === "postgres") {
    row = await withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_social_posts WHERE id = $1", [id])) as Record<string, unknown>[];
      return rows[0];
    });
  } else {
    row = getMarketingSqlite().prepare("SELECT * FROM marketing_social_posts WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
  }
  if (!row) return null;
  const post = mapPost(row);
  const metricsMap = await loadLatestMetricsForPosts([post.id]);
  return attachMetrics(post, metricsMap.get(post.id) ?? []);
}

function rowFromInput(input: SocialPostInput, id: string, ts: string): Record<string, unknown> {
  return {
    id,
    internal_label: input.internalLabel ?? null,
    body_text: input.bodyText ?? "",
    platform: input.platform,
    campaign_id: input.campaignId ?? null,
    status: input.status ?? "draft",
    scheduled_at: input.scheduledAt ?? null,
    published_at: input.publishedAt ?? null,
    platform_permalink: input.platformPermalink ?? null,
    destination_url: input.destinationUrl ?? null,
    cta_text: input.ctaText ?? null,
    hashtags: input.hashtags ?? null,
    topic_tags: JSON.stringify(input.topicTags ?? []),
    media_refs: JSON.stringify(input.mediaRefs ?? []),
    external_publish_state: input.isManualTrackOnly
      ? "published_verified"
      : input.status === "scheduled"
        ? "scheduled_internal"
        : "planned",
    publish_error: null,
    is_manual_track_only: input.isManualTrackOnly ? 1 : 0,
    created_at: ts,
    updated_at: ts,
  };
}

export async function createSocialPost(input: SocialPostInput): Promise<SocialPostWithMetrics> {
  if (input.status === "publishing" && !isMarketingPublishArmed()) {
    throw new Error("Cannot enter publishing state while MARKETING_PUBLISH_ARMED is disabled");
  }
  const ts = nowIso();
  const row = rowFromInput(input, newId(), ts);

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_social_posts
        (id, internal_label, body_text, platform, campaign_id, status, scheduled_at, published_at,
         platform_permalink, destination_url, cta_text, hashtags, topic_tags, media_refs,
         external_publish_state, publish_error, is_manual_track_only, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17,$18,$19)`,
        [
          row.id,
          row.internal_label,
          row.body_text,
          row.platform,
          row.campaign_id,
          row.status,
          row.scheduled_at,
          row.published_at,
          row.platform_permalink,
          row.destination_url,
          row.cta_text,
          row.hashtags,
          row.topic_tags,
          row.media_refs,
          row.external_publish_state,
          row.publish_error,
          row.is_manual_track_only,
          row.created_at,
          row.updated_at,
        ],
      );
    });
  } else {
    const db = getMarketingSqlite();
    db.prepare(
      `INSERT INTO marketing_social_posts
      (id, internal_label, body_text, platform, campaign_id, status, scheduled_at, published_at,
       platform_permalink, destination_url, cta_text, hashtags, topic_tags, media_refs,
       external_publish_state, publish_error, is_manual_track_only, created_at, updated_at)
      VALUES (@id, @internal_label, @body_text, @platform, @campaign_id, @status, @scheduled_at, @published_at,
       @platform_permalink, @destination_url, @cta_text, @hashtags, @topic_tags, @media_refs,
       @external_publish_state, @publish_error, @is_manual_track_only, @created_at, @updated_at)`,
    ).run(row);
  }

  const created = await getSocialPost(String(row.id));
  if (!created) throw new Error("Failed to load created post");
  return created;
}

export async function updateSocialPost(
  id: string,
  patch: Partial<SocialPostInput> & { status?: SocialPostStatus; scheduledAt?: string | null },
): Promise<SocialPostWithMetrics> {
  const existing = await getSocialPost(id);
  if (!existing) throw new Error("Post not found");
  if (patch.status) {
    assertSocialStatusTransition(existing.status, patch.status);
    if (patch.status === "publishing" && !isMarketingPublishArmed()) {
      throw new Error("Cannot enter publishing state while MARKETING_PUBLISH_ARMED is disabled");
    }
  }

  const ts = nowIso();
  const nextStatus = patch.status ?? existing.status;
  let externalState = existing.externalPublishState;
  if (patch.status === "scheduled") externalState = "scheduled_internal";
  if (patch.status === "published" && existing.isManualTrackOnly) externalState = "published_verified";
  if (patch.status === "published" && !existing.isManualTrackOnly) externalState = "planned";

  const fields: Record<string, unknown> = {
    internal_label: patch.internalLabel !== undefined ? patch.internalLabel : existing.internalLabel,
    body_text: patch.bodyText !== undefined ? patch.bodyText : existing.bodyText,
    platform: patch.platform ?? existing.platform,
    campaign_id: patch.campaignId !== undefined ? patch.campaignId : existing.campaignId,
    status: nextStatus,
    scheduled_at: patch.scheduledAt !== undefined ? patch.scheduledAt : existing.scheduledAt,
    published_at: patch.publishedAt !== undefined ? patch.publishedAt : existing.publishedAt,
    platform_permalink:
      patch.platformPermalink !== undefined ? patch.platformPermalink : existing.platformPermalink,
    destination_url: patch.destinationUrl !== undefined ? patch.destinationUrl : existing.destinationUrl,
    cta_text: patch.ctaText !== undefined ? patch.ctaText : existing.ctaText,
    hashtags: patch.hashtags !== undefined ? patch.hashtags : existing.hashtags,
    topic_tags: JSON.stringify(patch.topicTags ?? existing.topicTags),
    media_refs: JSON.stringify(patch.mediaRefs ?? existing.mediaRefs),
    external_publish_state: externalState,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `UPDATE marketing_social_posts SET
          internal_label = $2, body_text = $3, platform = $4, campaign_id = $5, status = $6,
          scheduled_at = $7, published_at = $8, platform_permalink = $9, destination_url = $10,
          cta_text = $11, hashtags = $12, topic_tags = $13::jsonb, media_refs = $14::jsonb,
          external_publish_state = $15, updated_at = $16
        WHERE id = $1`,
        [
          id,
          fields.internal_label,
          fields.body_text,
          fields.platform,
          fields.campaign_id,
          fields.status,
          fields.scheduled_at,
          fields.published_at,
          fields.platform_permalink,
          fields.destination_url,
          fields.cta_text,
          fields.hashtags,
          fields.topic_tags,
          fields.media_refs,
          fields.external_publish_state,
          fields.updated_at,
        ],
      );
    });
  } else {
    getMarketingSqlite()
      .prepare(
        `UPDATE marketing_social_posts SET
          internal_label = @internal_label, body_text = @body_text, platform = @platform, campaign_id = @campaign_id,
          status = @status, scheduled_at = @scheduled_at, published_at = @published_at, platform_permalink = @platform_permalink,
          destination_url = @destination_url, cta_text = @cta_text, hashtags = @hashtags, topic_tags = @topic_tags,
          media_refs = @media_refs, external_publish_state = @external_publish_state, updated_at = @updated_at
        WHERE id = @id`,
      )
      .run({ ...fields, id });
  }

  const updated = await getSocialPost(id);
  if (!updated) throw new Error("Failed to load updated post");
  return updated;
}

export async function recordManualPostMetrics(postId: string, input: SocialManualMetricsInput): Promise<SocialPostMetrics> {
  const post = await getSocialPost(postId);
  if (!post) throw new Error("Post not found");

  const engagements = sumEngagements({
    likes: input.likes ?? null,
    comments: input.comments ?? null,
    shares: input.shares ?? null,
    saves: input.saves ?? null,
    clicks: input.clicks ?? null,
  });

  const ts = nowIso();
  const row = {
    id: newId(),
    post_id: postId,
    source: "manual",
    provider_snapshot_id: null,
    period_start: null,
    period_end: null,
    impressions: input.impressions ?? null,
    reach: input.reach ?? null,
    engagements,
    likes: input.likes ?? null,
    comments: input.comments ?? null,
    shares: input.shares ?? null,
    saves: input.saves ?? null,
    clicks: input.clicks ?? null,
    video_views: input.videoViews ?? null,
    watch_time_sec: null,
    profile_visits: input.profileVisits ?? null,
    website_clicks: input.websiteClicks ?? null,
    followers_gained: null,
    recorded_at: ts,
    synced_at: null,
    notes: input.notes ?? null,
    created_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_social_post_metrics
        (id, post_id, source, impressions, reach, engagements, likes, comments, shares, saves, clicks,
         video_views, profile_visits, website_clicks, recorded_at, notes, created_at)
        VALUES ($1,$2,'manual',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          row.id,
          row.post_id,
          row.impressions,
          row.reach,
          row.engagements,
          row.likes,
          row.comments,
          row.shares,
          row.saves,
          row.clicks,
          row.video_views,
          row.profile_visits,
          row.website_clicks,
          row.recorded_at,
          row.notes,
          row.created_at,
        ],
      );
    });
  } else {
    getMarketingSqlite()
      .prepare(
        `INSERT INTO marketing_social_post_metrics
        (id, post_id, source, impressions, reach, engagements, likes, comments, shares, saves, clicks,
         video_views, profile_visits, website_clicks, recorded_at, notes, created_at)
        VALUES (@id, @post_id, @source, @impressions, @reach, @engagements, @likes, @comments, @shares, @saves, @clicks,
         @video_views, @profile_visits, @website_clicks, @recorded_at, @notes, @created_at)`,
      )
      .run(row);
  }

  return mapMetrics(row);
}

export async function updateSocialPostSchedule(id: string, scheduledAt: string | null): Promise<SocialPostWithMetrics> {
  return updateSocialPost(id, { scheduledAt, status: scheduledAt ? "scheduled" : "approved" });
}