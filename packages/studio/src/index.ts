/**
 * Shared Studio domain types (web, future iOS, API contracts).
 */

export const STUDIO_CONTENT_CATEGORIES = [
  "hook",
  "body",
  "cta",
  "broll",
  "testimonial",
  "other",
] as const;

export type StudioContentCategory = (typeof STUDIO_CONTENT_CATEGORIES)[number];

export const STUDIO_PIPELINE_STAGES = [
  "ideas",
  "recorded",
  "imported",
  "reviewed",
  "editing",
  "ready",
  "published",
] as const;

export type StudioPipelineStage = (typeof STUDIO_PIPELINE_STAGES)[number];

export const STUDIO_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".mkv"] as const;

export type StudioTargetPlatform =
  | "tiktok"
  | "instagram_reels"
  | "youtube_shorts"
  | "linkedin"
  | "youtube"
  | "custom";

export type StudioProjectStatus = "draft" | "editing" | "review" | "ready" | "exported";

export type StudioMediaAiFields = {
  topic?: string;
  speaker?: string;
  emotion?: string;
  energyLevel?: string;
  videoQuality?: string;
  audioQuality?: string;
  transcriptRef?: string;
  engagementPotential?: string;
  recommendedPlacement?: StudioContentCategory;
  brand?: string;
  language?: string;
  analysisStatus?: "pending" | "unavailable" | "complete";
};

export type StudioAuthorizedDirectory = {
  id: string;
  label: string;
  /** Absolute path on the host machine (never sent to remote clients unscoped). */
  rootPath: string;
  addedAt: string;
  lastScannedAt: string | null;
};

export type StudioMediaItem = {
  id: string;
  directoryId: string;
  fileName: string;
  /** Path relative to authorized directory root */
  relativePath: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  category: StudioContentCategory;
  dateAdded: string;
  dateModified: string;
  thumbnailKey: string | null;
  pipelineStage: StudioPipelineStage;
  ai: StudioMediaAiFields;
};

export type StudioProject = {
  id: string;
  title: string;
  status: StudioProjectStatus;
  targetPlatform: StudioTargetPlatform;
  aspectRatio: string;
  thumbnailMediaId: string | null;
  lastEditedAt: string;
  createdAt: string;
};

export type StudioIndexSnapshot = {
  version: 1;
  directories: StudioAuthorizedDirectory[];
  media: StudioMediaItem[];
  projects: StudioProject[];
};

export const STUDIO_CATEGORY_LABELS: Record<StudioContentCategory, string> = {
  hook: "Hooks",
  body: "Bodies",
  cta: "CTAs",
  broll: "B-roll",
  testimonial: "Testimonials",
  other: "Other",
};
