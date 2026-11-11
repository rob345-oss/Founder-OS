import fs from "node:fs";

import type { StudioIndexSnapshot } from "@founder-os/studio";

import { resolveMediaAbsolutePath } from "./paths";
import { findDirectory, findMedia } from "./store";

export function resolveIndexedMediaFile(
  snapshot: StudioIndexSnapshot,
  mediaId: string,
): { absolute: string; stat: fs.Stats } | null {
  const item = findMedia(snapshot, mediaId);
  if (!item) return null;
  const dir = findDirectory(snapshot, item.directoryId);
  if (!dir) return null;
  try {
    const absolute = resolveMediaAbsolutePath(dir.rootPath, item.relativePath);
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return null;
    return { absolute, stat };
  } catch {
    return null;
  }
}
