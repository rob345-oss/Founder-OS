import fs from "node:fs";
import path from "node:path";

import { assertWithinStudioMediaRoot } from "./media-root";

const WINDOWS_PREFIX = /^[a-zA-Z]:[\\/]/;

export function safeRealpath(p: string): string {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

export function normalizeWindowsPath(input: string): string {
  const trimmed = input.trim().replace(/^"|"$/g, "");
  return path.resolve(trimmed);
}

export function isPathInsideRoot(root: string, candidate: string): boolean {
  const rootResolved = safeRealpath(root);
  const fileResolved = safeRealpath(candidate);
  const relative = path.relative(rootResolved, fileResolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeRelativePath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute media paths are not allowed.");
  }
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || normalized.split(path.sep).includes("..")) {
    throw new Error("Path traversal blocked.");
  }
  return normalized.split(path.sep).join("/");
}

export function validateDirectoryPath(input: string): { ok: true; path: string } | { ok: false; error: string } {
  if (!input.trim()) {
    return { ok: false, error: "Path is required." };
  }
  const resolved = normalizeWindowsPath(input);
  if (process.platform === "win32" && !WINDOWS_PREFIX.test(resolved) && !resolved.startsWith("\\\\")) {
    return { ok: false, error: "Enter an absolute Windows path (e.g. D:\\Footage\\Reels)." };
  }
  try {
    const canonical = safeRealpath(resolved);
    const stat = fs.statSync(canonical);
    if (!stat.isDirectory()) {
      return { ok: false, error: "Path must be a directory." };
    }
    return { ok: true, path: canonical };
  } catch {
    return { ok: false, error: "Directory not found or not accessible." };
  }
}

export function resolveMediaAbsolutePath(rootPath: string, relativePath: string): string {
  const safeRelative = assertSafeRelativePath(relativePath);
  const joined = path.join(rootPath, safeRelative.split("/").join(path.sep));
  if (!isPathInsideRoot(rootPath, joined)) {
    throw new Error("Path traversal blocked.");
  }
  const canonical = safeRealpath(joined);
  if (!isPathInsideRoot(rootPath, canonical)) {
    throw new Error("Path traversal blocked.");
  }
  assertWithinStudioMediaRoot(canonical, "resolve_media_path");
  return canonical;
}
