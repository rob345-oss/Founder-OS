import fs from "node:fs";
import path from "node:path";

import { ensureStudioDataDir } from "./data-dir";
import { isPathInsideRoot, validateDirectoryPath } from "./paths";

const ENV_MEDIA_ROOT = "FOUNDER_OS_STUDIO_MEDIA_ROOT";

export class StudioMediaRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudioMediaRootError";
  }
}

export function isStudioMediaRootConfigured(): boolean {
  return Boolean(process.env[ENV_MEDIA_ROOT]?.trim());
}

/**
 * Resolved canonical media root when FOUNDER_OS_STUDIO_MEDIA_ROOT is set and valid.
 */
export function getStudioMediaRoot():
  | { configured: false }
  | { configured: true; ok: true; path: string }
  | { configured: true; ok: false; error: string } {
  const raw = process.env[ENV_MEDIA_ROOT]?.trim();
  if (!raw) return { configured: false };
  const validated = validateDirectoryPath(raw);
  if (!validated.ok) {
    return { configured: true, ok: false, error: validated.error };
  }
  return { configured: true, ok: true, path: validated.path };
}

export function assertStudioMediaRootReady(): string {
  const root = getStudioMediaRoot();
  if (!root.configured) {
    throw new StudioMediaRootError(
      "FOUNDER_OS_STUDIO_MEDIA_ROOT is not configured. Set it in apps/web/.env.local for local Studio media access.",
    );
  }
  if (!root.ok) {
    throw new StudioMediaRootError(root.error);
  }
  return root.path;
}

export function validateAuthorizedDirectoryRegistration(
  input: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const validated = validateDirectoryPath(input);
  if (!validated.ok) return validated;

  const root = getStudioMediaRoot();
  if (!root.configured) return validated;
  if (!root.ok) {
    return { ok: false, error: root.error };
  }
  if (!isPathInsideRoot(root.path, validated.path)) {
    logStudioMediaAccessDenied("register_directory", validated.path);
    return {
      ok: false,
      error: "Directory must be inside FOUNDER_OS_STUDIO_MEDIA_ROOT.",
    };
  }
  return validated;
}

/**
 * Defense-in-depth: every filesystem touch must stay inside the configured root (when set)
 * and inside the per-directory scan root (caller responsibility).
 */
export function assertWithinStudioMediaRoot(absolutePath: string, operation: string): void {
  const root = getStudioMediaRoot();
  if (!root.configured) return;
  if (!root.ok) {
    throw new StudioMediaRootError(root.error);
  }
  if (!isPathInsideRoot(root.path, absolutePath)) {
    logStudioMediaAccessDenied(operation, absolutePath);
    throw new StudioMediaRootError("Access outside authorized studio media root.");
  }
}

export function logStudioMediaAccessDenied(operation: string, attemptedPath: string): void {
  try {
    const logPath = path.join(ensureStudioDataDir(), "media-access-audit.log");
    const line = `${new Date().toISOString()}\tDENY\t${operation}\t${attemptedPath}\n`;
    fs.appendFileSync(logPath, line, { encoding: "utf8" });
  } catch {
    /* best-effort audit */
  }
}

/** Public-safe summary for the Studio UI (no full host paths). */
export function getStudioMediaRootPublicSummary(): {
  enforced: boolean;
  ready: boolean;
  displayName: string | null;
  error: string | null;
} {
  const root = getStudioMediaRoot();
  if (!root.configured) {
    return { enforced: false, ready: true, displayName: null, error: null };
  }
  if (!root.ok) {
    return { enforced: true, ready: false, displayName: null, error: root.error };
  }
  return {
    enforced: true,
    ready: true,
    displayName: path.basename(root.path),
    error: null,
  };
}
