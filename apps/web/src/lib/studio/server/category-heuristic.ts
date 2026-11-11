import type { StudioContentCategory } from "@founder-os/studio";

/**
 * Infer category from Titanium-style folder layout (hooks, CTAs, etc.).
 * Used only when the user has not set a category manually.
 */
export function inferCategoryFromRelativePath(relativePath: string): StudioContentCategory | null {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("/hooks/") || normalized.startsWith("hooks/")) return "hook";
  if (normalized.includes("/ctas/") || normalized.startsWith("ctas/")) return "cta";
  if (normalized.includes("/b-roll/") || normalized.includes("/broll/")) return "broll";
  if (normalized.includes("/bodies/") || normalized.includes("/body/")) return "body";
  if (normalized.includes("/06 - finals/") || normalized.includes("/finals/")) return "finished_video";
  return null;
}
