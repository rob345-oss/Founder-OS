/**
 * Shared Studio domain types (web, future iOS, API contracts).
 */

export const STUDIO_CONTENT_CATEGORIES = [
  "hook",
  "body",
  "cta",
  "broll",
  "testimonial",
  "interview",
  "screen_recording",
  "finished_video",
  "other",
] as const;

export type StudioContentCategory = (typeof STUDIO_CONTENT_CATEGORIES)[number];

export const STUDIO_REVIEW_STATUSES = [
  "unreviewed",
  "selected",
  "alternative",
  "rejected",
] as const;

export type StudioReviewStatus = (typeof STUDIO_REVIEW_STATUSES)[number];

export const STUDIO_MEDIA_KINDS = ["video", "image"] as const;
export type StudioMediaKind = (typeof STUDIO_MEDIA_KINDS)[number];

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
export const STUDIO_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const STUDIO_DEFAULT_TAGS = [
  "Emotional",
  "Educational",
  "Urgent",
  "Funny",
  "Storytelling",
  "Scam Awareness",
  "Phone Scam",
  "Family Protection",
  "AI",
  "Founder Story",
  "Behind the Scenes",
  "Product Demo",
] as const;

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
  /** Last known scan health when drive was unreachable */
  inaccessible?: boolean;
  lastError?: string | null;
};

export type StudioMediaItem = {
  id: string;
  directoryId: string;
  fileName: string;
  /** Path relative to authorized directory root */
  relativePath: string;
  kind: StudioMediaKind;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  frameRate: number | null;
  codec: string | null;
  category: StudioContentCategory;
  dateAdded: string;
  dateModified: string;
  dateIndexed: string;
  thumbnailKey: string | null;
  pipelineStage: StudioPipelineStage;
  favorite: boolean;
  rating: number | null;
  reviewStatus: StudioReviewStatus;
  takeNumber: number | null;
  tags: string[];
  notes: string;
  missing: boolean;
  projectId: string | null;
  ai: StudioMediaAiFields;
};

export type StudioCollection = {
  id: string;
  name: string;
  createdAt: string;
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
  /** Ordered media clip ids for editor import */
  mediaIds?: string[];
};

export type StudioScanJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type StudioScanJob = {
  id: string;
  status: StudioScanJobStatus;
  directoryId: string | null;
  startedAt: string;
  finishedAt: string | null;
  totalFiles: number;
  processed: number;
  failed: number;
  added: number;
  updated: number;
  removed: number;
  currentPath: string | null;
  error: string | null;
  cancelRequested: boolean;
};

export type StudioIndexSnapshot = {
  version: 2;
  directories: StudioAuthorizedDirectory[];
  media: StudioMediaItem[];
  projects: StudioProject[];
  collections: StudioCollection[];
};

export type StudioLibraryNavKey =
  | "all"
  | "recent"
  | "favorites"
  | "unreviewed"
  | "hook"
  | "body"
  | "cta"
  | "broll"
  | "testimonial"
  | "interview"
  | "screen_recording"
  | "finished_video"
  | "archived"
  | `collection:${string}`;

export const STUDIO_CATEGORY_LABELS: Record<StudioContentCategory, string> = {
  hook: "Hooks",
  body: "Bodies",
  cta: "CTAs",
  broll: "B-roll",
  testimonial: "Testimonials",
  interview: "Interviews",
  screen_recording: "Screen Recordings",
  finished_video: "Finished Videos",
  other: "Other",
};

export const STUDIO_REVIEW_LABELS: Record<StudioReviewStatus, string> = {
  unreviewed: "Unreviewed",
  selected: "Selected take",
  alternative: "Alternative",
  rejected: "Rejected",
};
