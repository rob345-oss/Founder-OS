import type { StudioIndexSnapshot } from "@founder-os/studio";

import { resolveIndexedMediaFile } from "./media-file";
import { assertWithinStudioMediaRoot, logStudioMediaAccessDenied } from "./media-root";

export type AiMediaAccessPurpose =
  | "preview_metadata"
  | "classification"
  | "transcript"
  | "embedding"
  | "edit_suggestion";

export type AiMediaAccessRequest = {
  mediaId: string;
  purpose: AiMediaAccessPurpose;
  /** Must be true to attach bytes or paths to an external model/provider. */
  allowExternalProvider?: boolean;
};

export type AiMediaAccessDecision =
  | {
      allowed: true;
      absolutePath: string;
      fileName: string;
      relativePath: string;
      maySendToExternalProvider: false;
    }
  | { allowed: false; reason: string };

const MUTATING_PURPOSES = new Set<AiMediaAccessPurpose>();

/**
 * Central gate for future Studio AI features. No providers are called here.
 * All AI adapters must use this module instead of direct filesystem access.
 */
export function authorizeAiMediaRead(
  snapshot: StudioIndexSnapshot,
  request: AiMediaAccessRequest,
): AiMediaAccessDecision {
  if (MUTATING_PURPOSES.size > 0) {
    /* reserved for explicit mutation approvals */
  }

  const resolved = resolveIndexedMediaFile(snapshot, request.mediaId);
  if (!resolved) {
    return { allowed: false, reason: "Media not found or offline." };
  }

  try {
    assertWithinStudioMediaRoot(resolved.absolute, `ai:${request.purpose}`);
  } catch (e) {
    return {
      allowed: false,
      reason: e instanceof Error ? e.message : "Outside authorized media root.",
    };
  }

  const item = snapshot.media.find((m) => m.id === request.mediaId);
  if (!item) return { allowed: false, reason: "Media record missing." };

  if (request.allowExternalProvider) {
    logStudioMediaAccessDenied(
      `ai_external_blocked:${request.purpose}`,
      resolved.absolute,
    );
    return {
      allowed: false,
      reason:
        "External AI providers are disabled until explicitly enabled in Studio privacy settings.",
    };
  }

  return {
    allowed: true,
    absolutePath: resolved.absolute,
    fileName: item.fileName,
    relativePath: item.relativePath,
    maySendToExternalProvider: false,
  };
}

export function denyAiFilesystemMutation(operation: string): never {
  logStudioMediaAccessDenied(`ai_mutation_blocked:${operation}`, operation);
  throw new Error("AI cannot rename, move, delete, or overwrite media without explicit user approval.");
}
