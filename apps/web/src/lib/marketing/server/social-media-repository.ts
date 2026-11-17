import type {
  SocialMediaAsset,
  SocialMediaAssetListQuery,
  SocialMediaAssetPatch,
  SocialMediaAssetType,
} from "../social-media-types";
import { getMarketingDriver, getMarketingSqlite, newId, nowIso, withMarketingPgClient } from "./db";
import { deleteMarketingMediaObject, storageKeyForUpload, writeMarketingMediaObject } from "./social-media-storage";
import { validateMarketingMediaUpload } from "./social-media-file-validation";

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

function mapAsset(row: Record<string, unknown>): SocialMediaAsset {
  const num = (k: string) => (row[k] != null ? Number(row[k]) : null);
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    altText: row.alt_text != null ? String(row.alt_text) : null,
    assetType: String(row.asset_type) as SocialMediaAssetType,
    storageUrl: row.storage_url != null ? String(row.storage_url) : null,
    storageKey: row.storage_key != null ? String(row.storage_key) : null,
    originalFilename: row.original_filename != null ? String(row.original_filename) : null,
    mimeType: row.mime_type != null ? String(row.mime_type) : null,
    byteSize: num("byte_size"),
    width: num("width"),
    height: num("height"),
    durationSec: num("duration_sec"),
    tags: parseJsonArray(row.tags),
    uploadState: String(row.upload_state ?? "ready") as SocialMediaAsset["uploadState"],
    archivedAt: row.archived_at != null ? String(row.archived_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listSocialMediaAssets(query: SocialMediaAssetListQuery = {}): Promise<SocialMediaAsset[]> {
  const limit = Math.min(query.limit ?? 200, 500);
  const offset = query.offset ?? 0;

  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const clauses: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (!query.includeArchived) {
        clauses.push("archived_at IS NULL");
      }
      if (query.assetType) {
        clauses.push(`asset_type = $${idx++}`);
        params.push(query.assetType);
      }
      if (query.q?.trim()) {
        clauses.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR original_filename ILIKE $${idx})`);
        params.push(`%${query.q.trim()}%`);
        idx++;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit, offset);
      const rows = (await q(
        `SELECT * FROM marketing_social_media_assets ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        params,
      )) as Record<string, unknown>[];
      return rows.map(mapAsset);
    });
  }

  const db = getMarketingSqlite();
  const clauses: string[] = [];
  const p: Record<string, unknown> = { limit, offset };
  if (!query.includeArchived) clauses.push("archived_at IS NULL");
  if (query.assetType) {
    clauses.push("asset_type = @assetType");
    p.assetType = query.assetType;
  }
  if (query.q?.trim()) {
    clauses.push("(title LIKE @q OR description LIKE @q OR original_filename LIKE @q)");
    p.q = `%${query.q.trim()}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM marketing_social_media_assets ${where}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all(p) as Record<string, unknown>[];
  return rows.map(mapAsset);
}

export async function getSocialMediaAsset(id: string, withUsage = false): Promise<SocialMediaAsset | null> {
  let row: Record<string, unknown> | undefined;
  if (getMarketingDriver() === "postgres") {
    row = await withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_social_media_assets WHERE id = $1", [id])) as Record<
        string,
        unknown
      >[];
      return rows[0];
    });
  } else {
    row = getMarketingSqlite().prepare("SELECT * FROM marketing_social_media_assets WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
  }
  if (!row) return null;
  const asset = mapAsset(row);
  if (!withUsage) return asset;
  const usedBy = await findPostIdsReferencingAsset(id);
  return { ...asset, usedByPostIds: usedBy };
}

export async function getSocialMediaAssetsByIds(ids: string[]): Promise<SocialMediaAsset[]> {
  if (!ids.length) return [];
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q("SELECT * FROM marketing_social_media_assets WHERE id = ANY($1::uuid[])", [
        ids,
      ])) as Record<string, unknown>[];
      const map = new Map(rows.map((r) => [String(r.id), mapAsset(r)]));
      return ids.map((id) => map.get(id)).filter(Boolean) as SocialMediaAsset[];
    });
  }
  const db = getMarketingSqlite();
  const out: SocialMediaAsset[] = [];
  const stmt = db.prepare("SELECT * FROM marketing_social_media_assets WHERE id = ?");
  for (const id of ids) {
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (row) out.push(mapAsset(row));
  }
  return out;
}

async function findPostIdsReferencingAsset(assetId: string): Promise<string[]> {
  if (getMarketingDriver() === "postgres") {
    return withMarketingPgClient(async (q) => {
      const rows = (await q(
        `SELECT id FROM marketing_social_posts
         WHERE media_refs::text LIKE $1 AND status NOT IN ('canceled')`,
        [`%${assetId}%`],
      )) as { id: string }[];
      return rows.map((r) => String(r.id));
    });
  }
  const rows = getMarketingSqlite()
    .prepare(
      `SELECT id FROM marketing_social_posts
       WHERE media_refs LIKE @needle AND status != 'canceled'`,
    )
    .all({ needle: `%${assetId}%` }) as { id: string }[];
  return rows.map((r) => String(r.id));
}

export async function ingestSocialMediaUpload(input: {
  filename: string;
  mimeType: string | null;
  buffer: Buffer;
  title?: string;
  altText?: string | null;
}): Promise<SocialMediaAsset> {
  const meta = validateMarketingMediaUpload(input.filename, input.mimeType, input.buffer);
  const id = newId();
  const ts = nowIso();
  const storageKey = storageKeyForUpload(id, meta.mimeType);
  const title = (input.title?.trim() || input.filename.replace(/\.[^.]+$/, "") || "Untitled").slice(0, 200);

  const row = {
    id,
    title,
    description: null,
    alt_text: input.altText ?? null,
    asset_type: meta.assetType,
    storage_url: `/api/marketing/social/media-assets/${id}/content`,
    storage_key: storageKey,
    original_filename: input.filename.slice(0, 255),
    mime_type: meta.mimeType,
    byte_size: meta.byteSize,
    width: meta.width,
    height: meta.height,
    duration_sec: null,
    tags: "[]",
    upload_state: "uploading",
    archived_at: null,
    created_at: ts,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_social_media_assets
        (id, title, description, alt_text, asset_type, storage_url, storage_key, original_filename,
         mime_type, byte_size, width, height, duration_sec, tags, upload_state, archived_at, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18)`,
        [
          row.id,
          row.title,
          row.description,
          row.alt_text,
          row.asset_type,
          row.storage_url,
          row.storage_key,
          row.original_filename,
          row.mime_type,
          row.byte_size,
          row.width,
          row.height,
          row.duration_sec,
          row.tags,
          row.upload_state,
          row.archived_at,
          row.created_at,
          row.updated_at,
        ],
      );
    });
  } else {
    getMarketingSqlite()
      .prepare(
        `INSERT INTO marketing_social_media_assets
        (id, title, description, alt_text, asset_type, storage_url, storage_key, original_filename,
         mime_type, byte_size, width, height, duration_sec, tags, upload_state, archived_at, created_at, updated_at)
        VALUES (@id,@title,@description,@alt_text,@asset_type,@storage_url,@storage_key,@original_filename,
         @mime_type,@byte_size,@width,@height,@duration_sec,@tags,@upload_state,@archived_at,@created_at,@updated_at)`,
      )
      .run(row);
  }

  try {
    await writeMarketingMediaObject(storageKey, input.buffer, meta.mimeType);
    await markSocialMediaUploadState(id, "ready");
  } catch (e) {
    await markSocialMediaUploadState(id, "failed");
    throw e;
  }

  const created = await getSocialMediaAsset(id);
  if (!created) throw new Error("Failed to load uploaded asset");
  return created;
}

async function markSocialMediaUploadState(id: string, state: "ready" | "failed" | "uploading"): Promise<void> {
  const ts = nowIso();
  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(`UPDATE marketing_social_media_assets SET upload_state = $2, updated_at = $3 WHERE id = $1`, [
        id,
        state,
        ts,
      ]);
    });
  } else {
    getMarketingSqlite()
      .prepare(`UPDATE marketing_social_media_assets SET upload_state = @state, updated_at = @ts WHERE id = @id`)
      .run({ id, state, ts });
  }
}

export async function updateSocialMediaAsset(id: string, patch: SocialMediaAssetPatch): Promise<SocialMediaAsset> {
  const existing = await getSocialMediaAsset(id);
  if (!existing) throw new Error("Asset not found");
  const ts = nowIso();
  const fields = {
    title: patch.title !== undefined ? patch.title : existing.title,
    description: patch.description !== undefined ? patch.description : existing.description,
    alt_text: patch.altText !== undefined ? patch.altText : existing.altText,
    tags: JSON.stringify(patch.tags ?? existing.tags),
    archived_at: patch.archivedAt !== undefined ? patch.archivedAt : existing.archivedAt,
    updated_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `UPDATE marketing_social_media_assets SET
          title = $2, description = $3, alt_text = $4, tags = $5::jsonb, archived_at = $6, updated_at = $7
        WHERE id = $1`,
        [id, fields.title, fields.description, fields.alt_text, fields.tags, fields.archived_at, fields.updated_at],
      );
    });
  } else {
    getMarketingSqlite()
      .prepare(
        `UPDATE marketing_social_media_assets SET
          title = @title, description = @description, alt_text = @alt_text, tags = @tags,
          archived_at = @archived_at, updated_at = @updated_at
        WHERE id = @id`,
      )
      .run({ ...fields, id });
  }

  const updated = await getSocialMediaAsset(id);
  if (!updated) throw new Error("Failed to load asset");
  return updated;
}

export async function deleteSocialMediaAsset(id: string, force = false): Promise<void> {
  const asset = await getSocialMediaAsset(id, true);
  if (!asset) throw new Error("Asset not found");
  const refs = asset.usedByPostIds ?? [];
  if (refs.length && !force) {
    throw new Error(
      `Asset is used by ${refs.length} post(s). Archive it instead, or remove references before deleting.`,
    );
  }

  if (asset.storageKey) {
    try {
      await deleteMarketingMediaObject(asset.storageKey);
    } catch {
      // keep metadata delete even if blob missing
    }
  }

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(`DELETE FROM marketing_social_media_assets WHERE id = $1`, [id]);
    });
  } else {
    getMarketingSqlite().prepare(`DELETE FROM marketing_social_media_assets WHERE id = ?`).run(id);
  }
}