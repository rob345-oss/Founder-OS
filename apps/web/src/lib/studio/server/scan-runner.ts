import fs from "node:fs";
import path from "node:path";

import {
  STUDIO_IMAGE_EXTENSIONS,
  STUDIO_VIDEO_EXTENSIONS,
  type StudioAuthorizedDirectory,
  type StudioMediaItem,
  type StudioMediaKind,
} from "@founder-os/studio";

import { thumbnailPath } from "./data-dir";
import { extractThumbnail, probeVideoFile } from "./ffprobe";
import { isPathInsideRoot } from "./paths";
import {
  createScanJob,
  getActiveScanJob,
  getScanJob,
  mediaIdForPath,
  readStudioIndex,
  removeMediaNotInSet,
  getMediaById,
  updateScanJob,
  upsertDirectory,
  setMediaTags,
  upsertMediaItem,
} from "./repository";

function aspectRatioLabel(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height);
  return `${width / g}:${height / g}`;
}

type MediaFile = { absolute: string; kind: StudioMediaKind };

function walkMedia(root: string, current: string, acc: MediaFile[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (!isPathInsideRoot(root, full)) continue;
    if (entry.isDirectory()) {
      walkMedia(root, full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if ((STUDIO_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
      acc.push({ absolute: full, kind: "video" });
    } else if ((STUDIO_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      acc.push({ absolute: full, kind: "image" });
    }
  }
}

let runningPromise: Promise<void> | null = null;

export function startScan(directoryId?: string | null): { jobId: string } | { error: string } {
  const active = getActiveScanJob();
  if (active) {
    return { error: "A scan is already in progress." };
  }
  const job = createScanJob(directoryId ?? null);
  if (!runningPromise) {
    runningPromise = runScanJob(job.id).finally(() => {
      runningPromise = null;
    });
  }
  return { jobId: job.id };
}

export async function runScanJob(jobId: string): Promise<void> {
  const job = getScanJob(jobId);
  if (!job) return;
  updateScanJob(jobId, { status: "running" });

  const directories: StudioAuthorizedDirectory[] = directoryIdFilter(
    readStudioIndex().directories,
    job.directoryId,
  );
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  let failed = 0;
  let processed = 0;
  let removedTotal = 0;

  try {
    const allFiles: { dir: StudioAuthorizedDirectory; files: MediaFile[] }[] = [];
    for (const dir of directories) {
      if (jobCancelled(jobId)) break;
      if (!fs.existsSync(dir.rootPath)) {
        upsertDirectory({
          ...dir,
          inaccessible: true,
          lastError: "Directory not found or drive disconnected.",
          lastScannedAt: now,
        });
        continue;
      }
      const files: MediaFile[] = [];
      walkMedia(dir.rootPath, dir.rootPath, files);
      allFiles.push({ dir, files });
    }

    const totalFiles = allFiles.reduce((n, g) => n + g.files.length, 0);
    updateScanJob(jobId, { totalFiles });

    for (const { dir, files } of allFiles) {
      if (jobCancelled(jobId)) break;
      const seenIds = new Set<string>();

      upsertDirectory({
        ...dir,
        inaccessible: false,
        lastError: null,
        lastScannedAt: now,
      });

      for (const { absolute, kind } of files) {
        if (jobCancelled(jobId)) break;
        const relative = path.relative(dir.rootPath, absolute);
        const relativeNorm = relative.split(path.sep).join("/");
        const id = mediaIdForPath(dir.rootPath, relativeNorm);
        seenIds.add(id);

        updateScanJob(jobId, { currentPath: relativeNorm, processed, failed, added, updated });

        let stat: fs.Stats;
        try {
          stat = fs.statSync(absolute);
        } catch {
          failed += 1;
          processed += 1;
          continue;
        }

        const existing = getMediaById(id);
        const mtime = stat.mtime.toISOString();
        const reuseMeta =
          existing &&
          !existing.missing &&
          existing.dateModified === mtime &&
          existing.thumbnailKey &&
          (kind === "image" || existing.durationSeconds != null);

        let durationSeconds: number | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let frameRate: number | null = null;
        let codec: string | null = null;

        if (kind === "video") {
          const probe = reuseMeta
            ? {
                durationSeconds: existing!.durationSeconds,
                width: existing!.width,
                height: existing!.height,
                frameRate: existing!.frameRate,
                codec: existing!.codec,
              }
            : await probeVideoFile(absolute);
          durationSeconds = probe.durationSeconds;
          width = probe.width;
          height = probe.height;
          frameRate = probe.frameRate;
          codec = probe.codec;
        } else if (reuseMeta) {
          width = existing!.width;
          height = existing!.height;
        } else {
          const probe = await probeVideoFile(absolute);
          width = probe.width;
          height = probe.height;
        }

        let thumbnailKey = existing?.thumbnailKey ?? null;
        if (!thumbnailKey) {
          thumbnailKey = id;
          const thumbOut = thumbnailPath(id);
          if (!fs.existsSync(thumbOut)) {
            if (kind === "video" && durationSeconds != null) {
              const ok = await extractThumbnail(absolute, thumbOut);
              if (!ok) thumbnailKey = null;
            } else if (kind === "image") {
              try {
                fs.copyFileSync(absolute, thumbOut);
              } catch {
                thumbnailKey = null;
              }
            }
          }
        }

        const item: StudioMediaItem = {
          id,
          directoryId: dir.id,
          fileName: path.basename(absolute),
          relativePath: relativeNorm,
          kind,
          fileSizeBytes: stat.size,
          durationSeconds,
          width,
          height,
          aspectRatio: aspectRatioLabel(width, height),
          frameRate,
          codec,
          category: existing?.category ?? "other",
          dateAdded: existing?.dateAdded ?? now,
          dateModified: mtime,
          dateIndexed: existing?.dateIndexed ?? now,
          thumbnailKey,
          pipelineStage: existing?.pipelineStage ?? "imported",
          favorite: existing?.favorite ?? false,
          rating: existing?.rating ?? null,
          reviewStatus: existing?.reviewStatus ?? "unreviewed",
          takeNumber: existing?.takeNumber ?? null,
          tags: existing?.tags ?? [],
          notes: existing?.notes ?? "",
          missing: false,
          projectId: existing?.projectId ?? null,
          ai: existing?.ai ?? { analysisStatus: "unavailable" },
        };

        upsertMediaItem(item);
        if (item.tags.length) setMediaTags(item.id, item.tags);
        if (!existing) added += 1;
        else if (existing.dateModified !== mtime) updated += 1;
        processed += 1;
        updateScanJob(jobId, { processed, failed, added, updated });
      }

      const removed = removeMediaNotInSet(dir.id, seenIds);
      removedTotal += removed;
      updateScanJob(jobId, { removed: removedTotal });
    }

    const status = jobCancelled(jobId) ? "cancelled" : "completed";
    updateScanJob(jobId, {
      status,
      finishedAt: new Date().toISOString(),
      processed,
      failed,
      added,
      updated,
      removed: removedTotal,
      currentPath: null,
    });
  } catch (e) {
    updateScanJob(jobId, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Scan failed",
      currentPath: null,
    });
  }
}

function directoryIdFilter(
  directories: StudioAuthorizedDirectory[],
  directoryId: string | null,
): StudioAuthorizedDirectory[] {
  if (!directoryId) return directories;
  return directories.filter((d) => d.id === directoryId);
}

function jobCancelled(jobId: string): boolean {
  const job = getScanJob(jobId);
  return Boolean(job?.cancelRequested);
}

export type ScanResult = {
  added: number;
  updated: number;
  removed: number;
  total: number;
};

/** Synchronous-style API for backward-compatible routes: enqueue and wait briefly or return job */
export async function scanAuthorizedDirectories(): Promise<ScanResult> {
  const started = startScan(null);
  if ("error" in started) {
    const active = getActiveScanJob();
    if (!active) throw new Error(started.error);
    return waitForJob(active.id);
  }
  return waitForJob(started.jobId);
}

async function waitForJob(jobId: string): Promise<ScanResult> {
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const job = getScanJob(jobId);
    if (!job) break;
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      const snapshot = readStudioIndex();
      return {
        added: job.added,
        updated: job.updated,
        removed: job.removed,
        total: snapshot.media.length,
      };
    }
  }
  const snapshot = readStudioIndex();
  return { added: 0, updated: 0, removed: 0, total: snapshot.media.length };
}
