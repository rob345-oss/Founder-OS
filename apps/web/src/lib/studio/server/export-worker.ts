import { studioExportsDir } from "./data-dir";
import { validateExportDestination } from "./export-output";
import {
  getExportJob,
  insertExportJob,
  newExportJobId,
  reconcileInterruptedExportJobs,
  updateExportJob,
} from "./export-repository";
import { resolveExportRenderPlan } from "./export-resolve";
import { getActiveExportJobId, runExportJob } from "./export-runner";
import { locateFfmpegBinaries } from "./ffmpeg-bin";
import { readStudioIndex } from "./repository";
import type { StudioExportJobSettings, StudioExportPresetId } from "@founder-os/studio";

const queue: string[] = [];
let draining = false;
let reconciled = false;

function ensureReconciled(): void {
  if (reconciled) return;
  reconcileInterruptedExportJobs();
  reconciled = true;
}

export function enqueueExportJob(jobId: string): void {
  ensureReconciled();
  if (!queue.includes(jobId)) queue.push(jobId);
  void drainExportQueue();
}

async function drainExportQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      if (getActiveExportJobId()) break;
      const jobId = queue.shift();
      if (!jobId) break;
      await executeExportJob(jobId);
    }
  } finally {
    draining = false;
    if (queue.length && !getActiveExportJobId()) {
      void drainExportQueue();
    }
  }
}

async function executeExportJob(jobId: string): Promise<void> {
  const job = getExportJob(jobId);
  if (!job || job.status !== "queued") return;

  const bins = await locateFfmpegBinaries();
  if (!bins) {
    updateExportJob(jobId, {
      status: "failed",
      error: "FFmpeg not found. Install FFmpeg or set FFMPEG_PATH.",
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  const resolved = await resolveExportRenderPlan(job.projectId, job.presetId, job.settings, bins);
  if (!resolved.ok) {
    updateExportJob(jobId, {
      status: "failed",
      error: resolved.errors.join(" "),
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  const dest = validateExportDestination(
    job.settings.outputDir,
    job.settings.fileName,
    job.settings.overwrite,
  );
  if (!dest.ok) {
    updateExportJob(jobId, {
      status: "failed",
      error: dest.error,
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  try {
    await runExportJob(jobId, resolved.plan, bins, dest.outputPath);
  } catch {
    /* status already set */
  }
}

export function createQueuedExport(body: {
  projectId: string;
  presetId: StudioExportPresetId;
  settings: StudioExportJobSettings;
}): ReturnType<typeof insertExportJob> | { error: string } {
  ensureReconciled();
  const snapshot = readStudioIndex();
  const project = snapshot.projects.find((p) => p.id === body.projectId);
  if (!project) return { error: "Project not found." };

  const outputDir = body.settings.outputDir?.trim() || studioExportsDir();
  const settings: StudioExportJobSettings = {
    ...body.settings,
    outputDir,
  };
  const dest = validateExportDestination(settings.outputDir, settings.fileName, settings.overwrite);
  if (!dest.ok) return { error: dest.error };

  if (getActiveExportJobId() || queue.length > 0) {
    /* still allow queueing */
  }

  const job = insertExportJob({
    id: newExportJobId(),
    projectId: body.projectId,
    projectTitle: project.title,
    presetId: body.presetId,
    settings,
    outputDir: dest.outputDir,
    fileName: dest.fileName,
  });
  enqueueExportJob(job.id);
  return job;
}
