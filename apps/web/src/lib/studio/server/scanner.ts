import fs from "node:fs";
import path from "node:path";

import { STUDIO_VIDEO_EXTENSIONS, type StudioMediaItem } from "@founder-os/studio";

import { thumbnailPath } from "./data-dir";
import { extractThumbnail, probeVideoFile } from "./ffprobe";
import { isPathInsideRoot } from "./paths";
import { mediaIdForPath, readStudioIndex, writeStudioIndex } from "./store";

function aspectRatioLabel(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height);
  return `${width / g}:${height / g}`;
}

function walkVideos(root: string, current: string, acc: string[]): void {
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
      walkVideos(root, full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if ((STUDIO_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
      acc.push(full);
    }
  }
}

export type ScanResult = {
  added: number;
  updated: number;
  removed: number;
  total: number;
};

export async function scanAuthorizedDirectories(): Promise<ScanResult> {
  const snapshot = readStudioIndex();
  const now = new Date().toISOString();
  const seenIds = new Set<string>();
  let added = 0;
  let updated = 0;

  const nextMedia: StudioMediaItem[] = [];

  for (const dir of snapshot.directories) {
    const files: string[] = [];
    walkVideos(dir.rootPath, dir.rootPath, files);
    dir.lastScannedAt = now;

    for (const absolute of files) {
      const relative = path.relative(dir.rootPath, absolute);
      const id = mediaIdForPath(dir.rootPath, relative);
      seenIds.add(id);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(absolute);
      } catch {
        continue;
      }

      const existing = snapshot.media.find((m) => m.id === id);
      const mtime = stat.mtime.toISOString();
      const reuseMeta =
        existing &&
        existing.dateModified === mtime &&
        existing.durationSeconds != null &&
        existing.thumbnailKey;

      const probe = reuseMeta
        ? {
            durationSeconds: existing.durationSeconds,
            width: existing.width,
            height: existing.height,
          }
        : await probeVideoFile(absolute);

      let thumbnailKey = existing?.thumbnailKey ?? null;
      if (!thumbnailKey && probe.durationSeconds != null) {
        thumbnailKey = id;
        const thumbOut = thumbnailPath(id);
        if (!fs.existsSync(thumbOut)) {
          const ok = await extractThumbnail(absolute, thumbOut);
          if (!ok) thumbnailKey = null;
        }
      }

      const item: StudioMediaItem = {
        id,
        directoryId: dir.id,
        fileName: path.basename(absolute),
        relativePath: relative.split(path.sep).join("/"),
        fileSizeBytes: stat.size,
        durationSeconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        aspectRatio: aspectRatioLabel(probe.width, probe.height),
        category: existing?.category ?? "other",
        dateAdded: existing?.dateAdded ?? now,
        dateModified: mtime,
        thumbnailKey,
        pipelineStage: existing?.pipelineStage ?? "imported",
        ai: existing?.ai ?? { analysisStatus: "unavailable" },
      };

      if (!existing) added += 1;
      else if (existing.dateModified !== mtime) updated += 1;
      nextMedia.push(item);
    }
  }

  const removed = snapshot.media.filter((m) => !seenIds.has(m.id)).length;
  snapshot.media = nextMedia;
  writeStudioIndex(snapshot);

  return { added, updated, removed, total: nextMedia.length };
}
