import crypto from "node:crypto";
import path from "node:path";

import type {
  StudioAuthorizedDirectory,
  StudioCollection,
  StudioContentCategory,
  StudioIndexSnapshot,
  StudioMediaItem,
  StudioPipelineStage,
  StudioProject,
  StudioReviewStatus,
  StudioScanJob,
  StudioTimelineProject,
} from "@founder-os/studio";
import {
  getPrimaryVideoTrack,
  hydrateTimelineFromMediaIds,
  layoutSequential,
  refreshProjectDuration,
  withPrimaryVideoClips,
} from "@founder-os/studio";

import { getStudioDb, rowToCollection, rowToDirectory, rowToMedia, rowToProject, rowToScanJob } from "./db";

export function mediaIdForPath(rootPath: string, relativePath: string): string {
  const hash = crypto.createHash("sha256").update(`${rootPath}::${relativePath}`).digest("hex");
  return hash.slice(0, 24);
}

export function directoryLabelFromPath(dirPath: string): string {
  return path.basename(dirPath) || dirPath;
}

export function newProjectId(): string {
  return crypto.randomUUID();
}

export function newDirectoryId(): string {
  return crypto.randomUUID();
}

export function newCollectionId(): string {
  return crypto.randomUUID();
}

export function newScanJobId(): string {
  return crypto.randomUUID();
}

export function defaultProjectTitle(): string {
  return `Untitled Project ${new Date().toLocaleDateString()}`;
}

export function readStudioIndex(): StudioIndexSnapshot {
  const db = getStudioDb();
  const directories = (
    db.prepare("SELECT * FROM directories ORDER BY added_at ASC").all() as Parameters<typeof rowToDirectory>[0][]
  ).map(rowToDirectory);
  const media = (db.prepare("SELECT * FROM media ORDER BY date_modified DESC").all() as Record<string, unknown>[]).map(
    (row) => rowToMedia(db, row),
  );
  const projects = (
    db.prepare("SELECT * FROM projects ORDER BY last_edited_at DESC").all() as Record<string, unknown>[]
  ).map((row) => rowToProject(db, row));
  const collections = (
    db.prepare("SELECT * FROM collections ORDER BY created_at DESC").all() as Record<string, unknown>[]
  ).map(rowToCollection);
  return { version: 2, directories, media, projects, collections };
}

export function writeStudioIndex(_snapshot: StudioIndexSnapshot): void {
  /* Legacy no-op: persistence is per-row in SQLite */
}

export function findDirectory(
  snapshot: StudioIndexSnapshot,
  directoryId: string,
): StudioAuthorizedDirectory | undefined {
  return snapshot.directories.find((d) => d.id === directoryId);
}

export function findMedia(snapshot: StudioIndexSnapshot, mediaId: string): StudioMediaItem | undefined {
  return snapshot.media.find((m) => m.id === mediaId);
}

export function getMediaById(mediaId: string): StudioMediaItem | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Record<string, unknown> | undefined;
  return row ? rowToMedia(db, row) : null;
}

export function findProject(snapshot: StudioIndexSnapshot, projectId: string): StudioProject | undefined {
  return snapshot.projects.find((p) => p.id === projectId);
}

export function upsertDirectory(directory: StudioAuthorizedDirectory): void {
  const db = getStudioDb();
  db.prepare(
    `INSERT INTO directories (id, label, root_path, added_at, last_scanned_at, inaccessible, last_error)
     VALUES (@id, @label, @rootPath, @addedAt, @lastScannedAt, @inaccessible, @lastError)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       last_scanned_at = excluded.last_scanned_at,
       inaccessible = excluded.inaccessible,
       last_error = excluded.last_error`,
  ).run({
    id: directory.id,
    label: directory.label,
    rootPath: directory.rootPath,
    addedAt: directory.addedAt,
    lastScannedAt: directory.lastScannedAt,
    inaccessible: directory.inaccessible ? 1 : 0,
    lastError: directory.lastError ?? null,
  });
}

export function deleteDirectory(directoryId: string): void {
  const db = getStudioDb();
  db.prepare("DELETE FROM directories WHERE id = ?").run(directoryId);
}

export function upsertMediaItem(item: StudioMediaItem): void {
  const db = getStudioDb();
  db.prepare(
    `INSERT INTO media (
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
    ON CONFLICT(id) DO UPDATE SET
      file_name = excluded.file_name,
      file_size_bytes = excluded.file_size_bytes,
      duration_seconds = excluded.duration_seconds,
      width = excluded.width,
      height = excluded.height,
      aspect_ratio = excluded.aspect_ratio,
      frame_rate = excluded.frame_rate,
      codec = excluded.codec,
      date_modified = excluded.date_modified,
      date_indexed = excluded.date_indexed,
      thumbnail_key = excluded.thumbnail_key,
      missing = excluded.missing`,
  ).run({
    id: item.id,
    directoryId: item.directoryId,
    fileName: item.fileName,
    relativePath: item.relativePath,
    kind: item.kind,
    fileSizeBytes: item.fileSizeBytes,
    durationSeconds: item.durationSeconds,
    width: item.width,
    height: item.height,
    aspectRatio: item.aspectRatio,
    frameRate: item.frameRate,
    codec: item.codec,
    category: item.category,
    dateAdded: item.dateAdded,
    dateModified: item.dateModified,
    dateIndexed: item.dateIndexed,
    thumbnailKey: item.thumbnailKey,
    pipelineStage: item.pipelineStage,
    favorite: item.favorite ? 1 : 0,
    rating: item.rating,
    reviewStatus: item.reviewStatus,
    takeNumber: item.takeNumber,
    notes: item.notes,
    missing: item.missing ? 1 : 0,
    projectId: item.projectId,
    aiJson: JSON.stringify(item.ai ?? {}),
  });
}

/** Marks indexed clips as offline when they disappear from disk (preserves tags and ratings). */
export function markMediaMissingNotInSet(directoryId: string, keepIds: Set<string>): number {
  const db = getStudioDb();
  const rows = db
    .prepare("SELECT id FROM media WHERE directory_id = ?")
    .all(directoryId) as { id: string }[];
  let marked = 0;
  const upd = db.prepare("UPDATE media SET missing = 1 WHERE id = ?");
  for (const { id } of rows) {
    if (!keepIds.has(id)) {
      upd.run(id);
      marked += 1;
    }
  }
  return marked;
}

/** @deprecated Use markMediaMissingNotInSet — kept for migrations/tests referencing the old name. */
export function removeMediaNotInSet(directoryId: string, keepIds: Set<string>): number {
  return markMediaMissingNotInSet(directoryId, keepIds);
}

export function setMediaTags(mediaId: string, tags: string[]): void {
  const db = getStudioDb();
  const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM media_tags WHERE media_id = ?").run(mediaId);
    const insert = db.prepare("INSERT INTO media_tags (media_id, tag) VALUES (?, ?)");
    for (const tag of normalized) insert.run(mediaId, tag);
  });
  txn();
}

export function patchMediaRecord(
  mediaId: string,
  patch: Partial<{
    category: StudioContentCategory;
    pipelineStage: StudioPipelineStage;
    favorite: boolean;
    rating: number | null;
    reviewStatus: StudioReviewStatus;
    takeNumber: number | null;
    notes: string;
    tags: string[];
    projectId: string | null;
    missing: boolean;
  }>,
): StudioMediaItem | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const fields: string[] = [];
  const params: Record<string, unknown> = { id: mediaId };

  if (patch.category !== undefined) {
    fields.push("category = @category");
    params.category = patch.category;
  }
  if (patch.pipelineStage !== undefined) {
    fields.push("pipeline_stage = @pipelineStage");
    params.pipelineStage = patch.pipelineStage;
  }
  if (patch.favorite !== undefined) {
    fields.push("favorite = @favorite");
    params.favorite = patch.favorite ? 1 : 0;
  }
  if (patch.rating !== undefined) {
    fields.push("rating = @rating");
    params.rating = patch.rating;
  }
  if (patch.reviewStatus !== undefined) {
    fields.push("review_status = @reviewStatus");
    params.reviewStatus = patch.reviewStatus;
  }
  if (patch.takeNumber !== undefined) {
    fields.push("take_number = @takeNumber");
    params.takeNumber = patch.takeNumber;
  }
  if (patch.notes !== undefined) {
    fields.push("notes = @notes");
    params.notes = patch.notes;
  }
  if (patch.projectId !== undefined) {
    fields.push("project_id = @projectId");
    params.projectId = patch.projectId;
  }
  if (patch.missing !== undefined) {
    fields.push("missing = @missing");
    params.missing = patch.missing ? 1 : 0;
  }

  if (fields.length) {
    db.prepare(`UPDATE media SET ${fields.join(", ")} WHERE id = @id`).run(params);
  }
  if (patch.tags !== undefined) setMediaTags(mediaId, patch.tags);

  const updated = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Record<string, unknown>;
  return rowToMedia(db, updated);
}

export function queryMedia(filters: {
  q?: string;
  category?: StudioContentCategory;
  directoryId?: string;
  kind?: StudioMediaItem["kind"];
  favorite?: boolean;
  reviewStatus?: StudioReviewStatus;
  collectionId?: string;
  missing?: boolean;
  ratingMin?: number;
  recentDays?: number;
  sort?: "modified_desc" | "modified_asc" | "name" | "duration" | "size" | "rating";
}): StudioMediaItem[] {
  const db = getStudioDb();
  const clauses: string[] = ["1=1"];
  const params: Record<string, unknown> = {};

  if (filters.directoryId) {
    clauses.push("m.directory_id = @directoryId");
    params.directoryId = filters.directoryId;
  }
  if (filters.category) {
    clauses.push("m.category = @category");
    params.category = filters.category;
  }
  if (filters.kind) {
    clauses.push("m.kind = @kind");
    params.kind = filters.kind;
  }
  if (filters.favorite) {
    clauses.push("m.favorite = 1");
  }
  if (filters.missing) {
    clauses.push("m.missing = 1");
  }
  if (filters.reviewStatus) {
    clauses.push("m.review_status = @reviewStatus");
    params.reviewStatus = filters.reviewStatus;
  }
  if (filters.ratingMin != null) {
    clauses.push("m.rating >= @ratingMin");
    params.ratingMin = filters.ratingMin;
  }
  if (filters.recentDays != null) {
    const cutoff = new Date(Date.now() - filters.recentDays * 864e5).toISOString();
    clauses.push("m.date_indexed >= @cutoff");
    params.cutoff = cutoff;
  }
  if (filters.collectionId) {
    clauses.push(
      "EXISTS (SELECT 1 FROM collection_media cm WHERE cm.media_id = m.id AND cm.collection_id = @collectionId)",
    );
    params.collectionId = filters.collectionId;
  }
  if (filters.q) {
    clauses.push(
      "(LOWER(m.file_name) LIKE @q OR LOWER(m.relative_path) LIKE @q OR LOWER(m.notes) LIKE @q OR EXISTS (SELECT 1 FROM media_tags t WHERE t.media_id = m.id AND LOWER(t.tag) LIKE @q))",
    );
    params.q = `%${filters.q.toLowerCase()}%`;
  }

  const order =
    filters.sort === "modified_asc"
      ? "m.date_modified ASC"
      : filters.sort === "name"
        ? "m.file_name COLLATE NOCASE ASC"
        : filters.sort === "duration"
          ? "m.duration_seconds IS NULL, m.duration_seconds DESC"
          : filters.sort === "size"
            ? "m.file_size_bytes DESC"
            : filters.sort === "rating"
              ? "m.rating IS NULL, m.rating DESC"
              : "m.date_modified DESC";

  const sql = `SELECT m.* FROM media m WHERE ${clauses.join(" AND ")} ORDER BY ${order}`;
  const rows = db.prepare(sql).all(params) as Record<string, unknown>[];
  return rows.map((row) => rowToMedia(db, row));
}

export function listCollections(): StudioCollection[] {
  const db = getStudioDb();
  return (db.prepare("SELECT * FROM collections ORDER BY name COLLATE NOCASE").all() as Record<string, unknown>[]).map(
    rowToCollection,
  );
}

export function createCollection(name: string): StudioCollection {
  const db = getStudioDb();
  const collection: StudioCollection = {
    id: newCollectionId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO collections (id, name, created_at) VALUES (?, ?, ?)").run(
    collection.id,
    collection.name,
    collection.createdAt,
  );
  return collection;
}

export function addMediaToCollection(collectionId: string, mediaIds: string[]): void {
  const db = getStudioDb();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO collection_media (collection_id, media_id) VALUES (?, ?)",
  );
  const txn = db.transaction(() => {
    for (const mediaId of mediaIds) insert.run(collectionId, mediaId);
  });
  txn();
}

export function insertProject(project: StudioProject): void {
  const db = getStudioDb();
  db.prepare(
    `INSERT INTO projects (id, title, status, target_platform, aspect_ratio, thumbnail_media_id, last_edited_at, created_at)
     VALUES (@id, @title, @status, @targetPlatform, @aspectRatio, @thumbnailMediaId, @lastEditedAt, @createdAt)`,
  ).run({
    id: project.id,
    title: project.title,
    status: project.status,
    targetPlatform: project.targetPlatform,
    aspectRatio: project.aspectRatio,
    thumbnailMediaId: project.thumbnailMediaId,
    lastEditedAt: project.lastEditedAt,
    createdAt: project.createdAt,
  });
}

export function setProjectMediaOrder(projectId: string, mediaIds: string[]): void {
  const db = getStudioDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM project_media WHERE project_id = ?").run(projectId);
    const insert = db.prepare(
      "INSERT INTO project_media (project_id, media_id, sort_order) VALUES (?, ?, ?)",
    );
    mediaIds.forEach((mediaId, index) => insert.run(projectId, mediaId, index));
    db.prepare("UPDATE projects SET last_edited_at = ? WHERE id = ?").run(new Date().toISOString(), projectId);
  });
  txn();
}

export function parseTimelineProject(raw: string | null | undefined): StudioTimelineProject | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StudioTimelineProject;
    if (data.schemaVersion !== 1 || !data.projectId || !Array.isArray(data.tracks)) return null;
    return data;
  } catch {
    return null;
  }
}

export function sourceDurationsForMediaIds(mediaIds: string[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const id of mediaIds) {
    map.set(id, getMediaById(id)?.durationSeconds ?? null);
  }
  return map;
}

export function sourceDurationsForTimeline(timeline: StudioTimelineProject): Map<string, number | null> {
  const ids = new Set<string>();
  for (const track of timeline.tracks) {
    for (const clip of track.clips) ids.add(clip.sourceMediaId);
  }
  return sourceDurationsForMediaIds([...ids]);
}

export function normalizeTimelineForSave(
  timeline: StudioTimelineProject,
  sourceDurations: Map<string, number | null>,
): StudioTimelineProject {
  const relaid = layoutSequential(getPrimaryVideoTrack(timeline), sourceDurations);
  const next = withPrimaryVideoClips(timeline, relaid);
  return refreshProjectDuration(next, sourceDurations);
}

export function loadProjectTimeline(projectId: string): StudioTimelineProject | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Record<string, unknown> | undefined;
  if (!row) return null;
  const project = rowToProject(db, row);
  const stored = parseTimelineProject(row.timeline_json != null ? String(row.timeline_json) : null);
  if (stored && stored.projectId === projectId) {
    const durations = sourceDurationsForTimeline(stored);
    return normalizeTimelineForSave(stored, durations);
  }
  const mediaIds = project.mediaIds ?? [];
  const durations = sourceDurationsForMediaIds(mediaIds);
  return hydrateTimelineFromMediaIds(projectId, project.title, project.aspectRatio, mediaIds, durations);
}

export function saveProjectTimeline(timeline: StudioTimelineProject): StudioTimelineProject {
  const db = getStudioDb();
  const durations = sourceDurationsForTimeline(timeline);
  const normalized = normalizeTimelineForSave(timeline, durations);
  const json = JSON.stringify(normalized);
  db.prepare("UPDATE projects SET timeline_json = ?, last_edited_at = ? WHERE id = ?").run(
    json,
    new Date().toISOString(),
    timeline.projectId,
  );
  const uniqueMediaOrder = [...new Set(normalized.tracks.flatMap((t) => (t.kind === "video" ? t.clips.map((c) => c.sourceMediaId) : [])))];
  setProjectMediaOrder(timeline.projectId, uniqueMediaOrder);
  return normalized;
}

export function getActiveScanJob(): StudioScanJob | null {
  const db = getStudioDb();
  const row = db
    .prepare(
      "SELECT * FROM scan_jobs WHERE status IN ('pending', 'running') ORDER BY started_at DESC LIMIT 1",
    )
    .get() as Record<string, unknown> | undefined;
  return row ? rowToScanJob(row) : null;
}

export function getScanJob(jobId: string): StudioScanJob | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT * FROM scan_jobs WHERE id = ?").get(jobId) as Record<string, unknown> | undefined;
  return row ? rowToScanJob(row) : null;
}

export function createScanJob(directoryId: string | null): StudioScanJob {
  const db = getStudioDb();
  const job: StudioScanJob = {
    id: newScanJobId(),
    status: "pending",
    directoryId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    totalFiles: 0,
    processed: 0,
    failed: 0,
    added: 0,
    updated: 0,
    removed: 0,
    currentPath: null,
    error: null,
    cancelRequested: false,
  };
  db.prepare(
    `INSERT INTO scan_jobs (
      id, status, directory_id, started_at, total_files, processed, failed, added, updated, removed
    ) VALUES (?, 'pending', ?, ?, 0, 0, 0, 0, 0, 0)`,
  ).run(job.id, directoryId, job.startedAt);
  return job;
}

export function updateScanJob(jobId: string, patch: Partial<StudioScanJob>): void {
  const db = getStudioDb();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: jobId };
  const map: [keyof StudioScanJob, string][] = [
    ["status", "status"],
    ["finishedAt", "finished_at"],
    ["totalFiles", "total_files"],
    ["processed", "processed"],
    ["failed", "failed"],
    ["added", "added"],
    ["updated", "updated"],
    ["removed", "removed"],
    ["currentPath", "current_path"],
    ["error", "error"],
    ["cancelRequested", "cancel_requested"],
  ];
  for (const [key, col] of map) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = @${key}`);
      let value: unknown = patch[key];
      if (key === "cancelRequested") value = patch.cancelRequested ? 1 : 0;
      params[key] = value;
    }
  }
  if (fields.length) {
    db.prepare(`UPDATE scan_jobs SET ${fields.join(", ")} WHERE id = @id`).run(params);
  }
}

export function requestScanCancel(jobId: string): void {
  updateScanJob(jobId, { cancelRequested: true });
}
