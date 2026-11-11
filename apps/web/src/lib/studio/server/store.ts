import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type {
  StudioAuthorizedDirectory,
  StudioIndexSnapshot,
  StudioMediaItem,
  StudioProject,
} from "@founder-os/studio";

import { studioIndexPath } from "./data-dir";

const emptySnapshot = (): StudioIndexSnapshot => ({
  version: 1,
  directories: [],
  media: [],
  projects: [],
});

export function readStudioIndex(): StudioIndexSnapshot {
  const indexPath = studioIndexPath();
  if (!fs.existsSync(indexPath)) {
    return emptySnapshot();
  }
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const data = JSON.parse(raw) as StudioIndexSnapshot;
    if (data.version !== 1) return emptySnapshot();
    return data;
  } catch {
    return emptySnapshot();
  }
}

export function writeStudioIndex(snapshot: StudioIndexSnapshot): void {
  const indexPath = studioIndexPath();
  fs.writeFileSync(indexPath, JSON.stringify(snapshot, null, 2), "utf8");
}

export function mediaIdForPath(rootPath: string, relativePath: string): string {
  const hash = crypto.createHash("sha256").update(`${rootPath}::${relativePath}`).digest("hex");
  return hash.slice(0, 24);
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

export function findProject(snapshot: StudioIndexSnapshot, projectId: string): StudioProject | undefined {
  return snapshot.projects.find((p) => p.id === projectId);
}

export function defaultProjectTitle(): string {
  return `Untitled Project ${new Date().toLocaleDateString()}`;
}

export function newProjectId(): string {
  return crypto.randomUUID();
}

export function newDirectoryId(): string {
  return crypto.randomUUID();
}

export function directoryLabelFromPath(dirPath: string): string {
  return path.basename(dirPath) || dirPath;
}
