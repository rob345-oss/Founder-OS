import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function getStudioDataDir(): string {
  const fromEnv = process.env.FOUNDER_OS_STUDIO_DATA_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".founder-os");
  return path.join(base, "FounderOS", "Studio");
}

export function ensureStudioDataDir(): string {
  const dir = getStudioDataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "thumbnails"), { recursive: true });
  fs.mkdirSync(path.join(dir, "exports"), { recursive: true });
  fs.mkdirSync(path.join(dir, "export-temp"), { recursive: true });
  return dir;
}

export function studioExportsDir(): string {
  return path.join(ensureStudioDataDir(), "exports");
}

export function studioExportTempDir(): string {
  return path.join(ensureStudioDataDir(), "export-temp");
}

export function studioIndexPath(): string {
  return path.join(ensureStudioDataDir(), "index.json");
}

export function thumbnailPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(ensureStudioDataDir(), "thumbnails", `${safe}.jpg`);
}
