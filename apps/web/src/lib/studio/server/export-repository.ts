import crypto from "node:crypto";

import type {
  StudioExportJob,
  StudioExportJobSettings,
  StudioExportJobStatus,
  StudioExportPresetId,
} from "@founder-os/studio";

import { getStudioDb } from "./db";
import { safeDeleteFile } from "./export-output";

export function newExportJobId(): string {
  return crypto.randomUUID();
}

function rowToJob(row: Record<string, unknown>): StudioExportJob {
  let settings = {} as StudioExportJobSettings;
  try {
    settings = JSON.parse(String(row.settings_json ?? "{}")) as StudioExportJobSettings;
  } catch {
    /* keep default */
  }
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    projectTitle: String(row.project_title ?? ""),
    status: row.status as StudioExportJobStatus,
    presetId: row.preset_id as StudioExportPresetId,
    settings,
    outputPath: row.output_path != null ? String(row.output_path) : null,
    progress: Number(row.progress ?? 0),
    progressLabel: row.progress_label != null ? String(row.progress_label) : null,
    error: row.error != null ? String(row.error) : null,
    outputDurationSeconds:
      row.output_duration_seconds != null ? Number(row.output_duration_seconds) : null,
    outputSizeBytes: row.output_size_bytes != null ? Number(row.output_size_bytes) : null,
    cancelRequested: Number(row.cancel_requested) === 1,
    createdAt: String(row.created_at),
    startedAt: row.started_at != null ? String(row.started_at) : null,
    finishedAt: row.finished_at != null ? String(row.finished_at) : null,
  };
}

export function insertExportJob(job: {
  id: string;
  projectId: string;
  projectTitle: string;
  presetId: StudioExportPresetId;
  settings: StudioExportJobSettings;
  outputDir: string;
  fileName: string;
}): StudioExportJob {
  const db = getStudioDb();
  const now = new Date().toISOString();
  const record = {
    id: job.id,
    projectId: job.projectId,
    projectTitle: job.projectTitle,
    status: "queued" as const,
    presetId: job.presetId,
    settings: job.settings,
    fileName: job.fileName,
    outputDir: job.outputDir,
  };
  db.prepare(
    `INSERT INTO export_jobs (
      id, project_id, project_title, status, preset_id, settings_json,
      output_file_name, output_dir, progress, created_at
    ) VALUES (
      @id, @projectId, @projectTitle, 'queued', @presetId, @settingsJson,
      @fileName, @outputDir, 0, @createdAt
    )`,
  ).run({
    id: record.id,
    projectId: record.projectId,
    projectTitle: record.projectTitle,
    presetId: record.presetId,
    settingsJson: JSON.stringify(record.settings),
    fileName: record.fileName,
    outputDir: record.outputDir,
    createdAt: now,
  });
  return getExportJob(record.id)!;
}

export function getExportJob(id: string): StudioExportJob | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT * FROM export_jobs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

export function listExportJobs(limit = 100): StudioExportJob[] {
  const db = getStudioDb();
  const rows = db
    .prepare("SELECT * FROM export_jobs ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function updateExportJob(
  id: string,
  patch: Partial<{
    status: StudioExportJobStatus;
    outputPath: string | null;
    tempOutputPath: string | null;
    progress: number;
    progressLabel: string | null;
    error: string | null;
    outputDurationSeconds: number | null;
    outputSizeBytes: number | null;
    cancelRequested: boolean;
    startedAt: string | null;
    finishedAt: string | null;
  }>,
): StudioExportJob | null {
  const db = getStudioDb();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  const map: [keyof typeof patch, string][] = [
    ["status", "status"],
    ["outputPath", "output_path"],
    ["tempOutputPath", "temp_output_path"],
    ["progress", "progress"],
    ["progressLabel", "progress_label"],
    ["error", "error"],
    ["outputDurationSeconds", "output_duration_seconds"],
    ["outputSizeBytes", "output_size_bytes"],
    ["cancelRequested", "cancel_requested"],
    ["startedAt", "started_at"],
    ["finishedAt", "finished_at"],
  ];
  for (const [key, col] of map) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = @${key}`);
      let value: unknown = patch[key];
      if (key === "cancelRequested") value = patch.cancelRequested ? 1 : 0;
      params[key] = value;
    }
  }
  if (!fields.length) return getExportJob(id);
  db.prepare(`UPDATE export_jobs SET ${fields.join(", ")} WHERE id = @id`).run(params);
  return getExportJob(id);
}

export function requestExportCancel(id: string): StudioExportJob | null {
  return updateExportJob(id, { cancelRequested: true });
}

export function reconcileInterruptedExportJobs(): number {
  const db = getStudioDb();
  const rows = db
    .prepare(
      `SELECT id, temp_output_path FROM export_jobs
       WHERE status IN ('preparing', 'rendering', 'finalizing')`,
    )
    .all() as { id: string; temp_output_path: string | null }[];
  let n = 0;
  for (const row of rows) {
    safeDeleteFile(row.temp_output_path);
    updateExportJob(row.id, {
      status: "failed",
      error: "Export interrupted when Studio stopped. Re-queue a new export.",
      finishedAt: new Date().toISOString(),
      progressLabel: null,
      tempOutputPath: null,
    });
    n += 1;
  }
  return n;
}

export function getExportJobOutputPath(id: string): string | null {
  const db = getStudioDb();
  const row = db.prepare("SELECT output_path FROM export_jobs WHERE id = ?").get(id) as
    | { output_path: string | null }
    | undefined;
  return row?.output_path ?? null;
}
