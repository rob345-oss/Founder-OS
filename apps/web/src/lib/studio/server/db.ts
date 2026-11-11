import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type {
  StudioAuthorizedDirectory,
  StudioCollection,
  StudioMediaAiFields,
  StudioMediaItem,
  StudioProject,
  StudioScanJob,
} from "@founder-os/studio";

import { ensureStudioDataDir, studioIndexPath } from "./data-dir";

let dbInstance: Database.Database | null = null;

const SCHEMA_VERSION = 1;

export function studioDbPath(): string {
  return path.join(ensureStudioDataDir(), "studio.db");
}

export function closeStudioDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getStudioDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbPath = studioDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  migrateLegacyJsonIfNeeded(db);
  dbInstance = db;
  return db;
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS directories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      root_path TEXT NOT NULL UNIQUE COLLATE NOCASE,
      added_at TEXT NOT NULL,
      last_scanned_at TEXT,
      inaccessible INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      directory_id TEXT NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'video',
      file_size_bytes INTEGER NOT NULL,
      duration_seconds REAL,
      width INTEGER,
      height INTEGER,
      aspect_ratio TEXT,
      frame_rate REAL,
      codec TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      date_added TEXT NOT NULL,
      date_modified TEXT NOT NULL,
      date_indexed TEXT NOT NULL,
      thumbnail_key TEXT,
      pipeline_stage TEXT NOT NULL DEFAULT 'imported',
      favorite INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      review_status TEXT NOT NULL DEFAULT 'unreviewed',
      take_number INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      missing INTEGER NOT NULL DEFAULT 0,
      project_id TEXT,
      ai_json TEXT NOT NULL DEFAULT '{}',
      UNIQUE(directory_id, relative_path)
    );

    CREATE INDEX IF NOT EXISTS idx_media_directory ON media(directory_id);
    CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
    CREATE INDEX IF NOT EXISTS idx_media_modified ON media(date_modified);
    CREATE INDEX IF NOT EXISTS idx_media_favorite ON media(favorite);
    CREATE INDEX IF NOT EXISTS idx_media_review ON media(review_status);

    CREATE TABLE IF NOT EXISTS media_tags (
      media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      tag TEXT NOT NULL COLLATE NOCASE,
      PRIMARY KEY (media_id, tag)
    );
    CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags(tag);

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_media (
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      PRIMARY KEY (collection_id, media_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      target_platform TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      thumbnail_media_id TEXT,
      last_edited_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_media (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (project_id, media_id)
    );

    CREATE TABLE IF NOT EXISTS scan_jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      directory_id TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      total_files INTEGER NOT NULL DEFAULT 0,
      processed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      added INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL DEFAULT 0,
      removed INTEGER NOT NULL DEFAULT 0,
      current_path TEXT,
      error TEXT,
      cancel_requested INTEGER NOT NULL DEFAULT 0
    );
  `);

  const row = db.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get() as
    | { value: string }
    | undefined;
  if (!row) {
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('version', ?)").run(String(SCHEMA_VERSION));
  }
}

type LegacyV1 = {
  version?: number;
  directories: StudioAuthorizedDirectory[];
  media: (StudioMediaItem & { kind?: StudioMediaItem["kind"] })[];
  projects: StudioProject[];
};

function migrateLegacyJsonIfNeeded(db: Database.Database): void {
  const migrated = db.prepare("SELECT value FROM schema_meta WHERE key = 'json_migrated'").get() as
    | { value: string }
    | undefined;
  if (migrated?.value === "1") return;

  const indexPath = studioIndexPath();
  if (!fs.existsSync(indexPath)) {
    db.prepare(
      "INSERT INTO schema_meta (key, value) VALUES ('json_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run();
    return;
  }

  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const data = JSON.parse(raw) as LegacyV1;
    const insertDir = db.prepare(`
      INSERT OR IGNORE INTO directories (id, label, root_path, added_at, last_scanned_at)
      VALUES (@id, @label, @rootPath, @addedAt, @lastScannedAt)
    `);
    for (const d of data.directories ?? []) {
      insertDir.run({
        id: d.id,
        label: d.label,
        rootPath: d.rootPath,
        addedAt: d.addedAt,
        lastScannedAt: d.lastScannedAt,
      });
    }

    const insertMedia = db.prepare(`
      INSERT OR IGNORE INTO media (
        id, directory_id, file_name, relative_path, kind, file_size_bytes,
        duration_seconds, width, height, aspect_ratio, frame_rate, codec,
        category, date_added, date_modified, date_indexed, thumbnail_key,
        pipeline_stage, favorite, rating, review_status, take_number, notes, missing, project_id, ai_json
      ) VALUES (
        @id, @directoryId, @fileName, @relativePath, @kind, @fileSizeBytes,
        @durationSeconds, @width, @height, @aspectRatio, @frameRate, @codec,
        @category, @dateAdded, @dateModified, @dateIndexed, @thumbnailKey,
        @pipelineStage, @favorite, @rating, @reviewStatus, @takeNumber, @notes, @missing, @projectId, @aiJson
      )
    `);

    for (const m of data.media ?? []) {
      const dateIndexed = m.dateIndexed ?? m.dateAdded;
      insertMedia.run({
        id: m.id,
        directoryId: m.directoryId,
        fileName: m.fileName,
        relativePath: m.relativePath,
        kind: m.kind ?? "video",
        fileSizeBytes: m.fileSizeBytes,
        durationSeconds: m.durationSeconds,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        frameRate: m.frameRate ?? null,
        codec: m.codec ?? null,
        category: m.category,
        dateAdded: m.dateAdded,
        dateModified: m.dateModified,
        dateIndexed,
        thumbnailKey: m.thumbnailKey,
        pipelineStage: m.pipelineStage,
        favorite: m.favorite ? 1 : 0,
        rating: m.rating ?? null,
        reviewStatus: m.reviewStatus ?? "unreviewed",
        takeNumber: m.takeNumber ?? null,
        notes: m.notes ?? "",
        missing: m.missing ? 1 : 0,
        projectId: m.projectId ?? null,
        aiJson: JSON.stringify(m.ai ?? { analysisStatus: "unavailable" }),
      });
    }

    const insertProject = db.prepare(`
      INSERT OR IGNORE INTO projects (
        id, title, status, target_platform, aspect_ratio, thumbnail_media_id, last_edited_at, created_at
      ) VALUES (@id, @title, @status, @targetPlatform, @aspectRatio, @thumbnailMediaId, @lastEditedAt, @createdAt)
    `);
    for (const p of data.projects ?? []) {
      insertProject.run({
        id: p.id,
        title: p.title,
        status: p.status,
        targetPlatform: p.targetPlatform,
        aspectRatio: p.aspectRatio,
        thumbnailMediaId: p.thumbnailMediaId,
        lastEditedAt: p.lastEditedAt,
        createdAt: p.createdAt,
      });
    }

    db.prepare(
      "INSERT INTO schema_meta (key, value) VALUES ('json_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run();
  } catch {
    db.prepare(
      "INSERT INTO schema_meta (key, value) VALUES ('json_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run();
  }
}

export function rowToDirectory(row: {
  id: string;
  label: string;
  root_path: string;
  added_at: string;
  last_scanned_at: string | null;
  inaccessible: number;
  last_error: string | null;
}): StudioAuthorizedDirectory {
  return {
    id: row.id,
    label: row.label,
    rootPath: row.root_path,
    addedAt: row.added_at,
    lastScannedAt: row.last_scanned_at,
    inaccessible: row.inaccessible === 1,
    lastError: row.last_error,
  };
}

export function loadTagsForMedia(db: Database.Database, mediaId: string): string[] {
  const rows = db
    .prepare("SELECT tag FROM media_tags WHERE media_id = ? ORDER BY tag COLLATE NOCASE")
    .all(mediaId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

export function rowToMedia(db: Database.Database, row: Record<string, unknown>): StudioMediaItem {
  const id = String(row.id);
  let ai: StudioMediaAiFields = { analysisStatus: "unavailable" };
  try {
    ai = JSON.parse(String(row.ai_json ?? "{}")) as StudioMediaAiFields;
  } catch {
    /* keep default */
  }
  return {
    id,
    directoryId: String(row.directory_id),
    fileName: String(row.file_name),
    relativePath: String(row.relative_path),
    kind: (row.kind as StudioMediaItem["kind"]) ?? "video",
    fileSizeBytes: Number(row.file_size_bytes),
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    aspectRatio: row.aspect_ratio != null ? String(row.aspect_ratio) : null,
    frameRate: row.frame_rate != null ? Number(row.frame_rate) : null,
    codec: row.codec != null ? String(row.codec) : null,
    category: row.category as StudioMediaItem["category"],
    dateAdded: String(row.date_added),
    dateModified: String(row.date_modified),
    dateIndexed: String(row.date_indexed),
    thumbnailKey: row.thumbnail_key != null ? String(row.thumbnail_key) : null,
    pipelineStage: row.pipeline_stage as StudioMediaItem["pipelineStage"],
    favorite: Number(row.favorite) === 1,
    rating: row.rating != null ? Number(row.rating) : null,
    reviewStatus: (row.review_status as StudioMediaItem["reviewStatus"]) ?? "unreviewed",
    takeNumber: row.take_number != null ? Number(row.take_number) : null,
    tags: loadTagsForMedia(db, id),
    notes: String(row.notes ?? ""),
    missing: Number(row.missing) === 1,
    projectId: row.project_id != null ? String(row.project_id) : null,
    ai,
  };
}

export function rowToProject(db: Database.Database, row: Record<string, unknown>): StudioProject {
  const id = String(row.id);
  const mediaRows = db
    .prepare("SELECT media_id FROM project_media WHERE project_id = ? ORDER BY sort_order ASC")
    .all(id) as { media_id: string }[];
  return {
    id,
    title: String(row.title),
    status: row.status as StudioProject["status"],
    targetPlatform: row.target_platform as StudioProject["targetPlatform"],
    aspectRatio: String(row.aspect_ratio),
    thumbnailMediaId: row.thumbnail_media_id != null ? String(row.thumbnail_media_id) : null,
    lastEditedAt: String(row.last_edited_at),
    createdAt: String(row.created_at),
    mediaIds: mediaRows.map((r) => r.media_id),
  };
}

export function rowToCollection(row: Record<string, unknown>): StudioCollection {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
  };
}

export function rowToScanJob(row: Record<string, unknown>): StudioScanJob {
  return {
    id: String(row.id),
    status: row.status as StudioScanJob["status"],
    directoryId: row.directory_id != null ? String(row.directory_id) : null,
    startedAt: String(row.started_at),
    finishedAt: row.finished_at != null ? String(row.finished_at) : null,
    totalFiles: Number(row.total_files),
    processed: Number(row.processed),
    failed: Number(row.failed),
    added: Number(row.added),
    updated: Number(row.updated),
    removed: Number(row.removed),
    currentPath: row.current_path != null ? String(row.current_path) : null,
    error: row.error != null ? String(row.error) : null,
    cancelRequested: Number(row.cancel_requested) === 1,
  };
}
