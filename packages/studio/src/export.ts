/**
 * Studio local export jobs and presets (Phase 2C).
 */

export const STUDIO_EXPORT_PRESET_IDS = ["vertical_social", "landscape", "square"] as const;
export type StudioExportPresetId = (typeof STUDIO_EXPORT_PRESET_IDS)[number];

export const STUDIO_EXPORT_QUALITY_IDS = ["high", "standard", "fast"] as const;
export type StudioExportQualityId = (typeof STUDIO_EXPORT_QUALITY_IDS)[number];

export type StudioExportPreset = {
  id: StudioExportPresetId;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate: number;
  videoCodec: "libx264";
  audioCodec: "aac";
  /** Fit source into canvas without cropping (letterbox/pillarbox). */
  fitMode: "contain_pad";
};

export const STUDIO_EXPORT_PRESETS: Record<StudioExportPresetId, StudioExportPreset> = {
  vertical_social: {
    id: "vertical_social",
    label: "Vertical Social",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    frameRate: 30,
    videoCodec: "libx264",
    audioCodec: "aac",
    fitMode: "contain_pad",
  },
  landscape: {
    id: "landscape",
    label: "Landscape",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    frameRate: 30,
    videoCodec: "libx264",
    audioCodec: "aac",
    fitMode: "contain_pad",
  },
  square: {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    frameRate: 30,
    videoCodec: "libx264",
    audioCodec: "aac",
    fitMode: "contain_pad",
  },
};

export const STUDIO_EXPORT_QUALITY_CRF: Record<StudioExportQualityId, number> = {
  high: 18,
  standard: 23,
  fast: 28,
};

export const STUDIO_EXPORT_JOB_STATUSES = [
  "queued",
  "preparing",
  "rendering",
  "finalizing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type StudioExportJobStatus = (typeof STUDIO_EXPORT_JOB_STATUSES)[number];

export type StudioExportJobSettings = {
  presetId: StudioExportPresetId;
  qualityId: StudioExportQualityId;
  fileName: string;
  outputDir: string;
  overwrite: boolean;
};

export type StudioExportJob = {
  id: string;
  projectId: string;
  projectTitle: string;
  status: StudioExportJobStatus;
  presetId: StudioExportPresetId;
  settings: StudioExportJobSettings;
  outputPath: string | null;
  progress: number;
  progressLabel: string | null;
  error: string | null;
  outputDurationSeconds: number | null;
  outputSizeBytes: number | null;
  cancelRequested: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};
