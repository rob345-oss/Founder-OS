/**
 * Non-destructive project timeline model (Phase 2B+).
 * Source media files are never modified; edits are clip instances with in/out points.
 */

export type StudioTimelineTrackKind = "video" | "audio" | "captions";

export type StudioTimelineClipInstance = {
  id: string;
  /** Ordered index within the track */
  order: number;
  /** Reference into the local media index (`StudioMediaItem.id`) */
  sourceMediaId: string;
  /** Trim points in source media time (seconds) */
  sourceInSeconds: number;
  sourceOutSeconds: number | null;
  /** Placement on the sequence timeline (seconds from t=0) */
  timelineStartSeconds: number;
  /** Optional label in the UI / future AI caption */
  label?: string;
  /** Future: speed, opacity, linked audio */
  metadata?: Record<string, unknown>;
};

export type StudioTimelineTrack = {
  id: string;
  kind: StudioTimelineTrackKind;
  label: string;
  clips: StudioTimelineClipInstance[];
  /** Future multitrack stacking */
  lane?: number;
  muted?: boolean;
  locked?: boolean;
};

export type StudioTimelineProject = {
  schemaVersion: 1;
  projectId: string;
  title: string;
  /** Canvas aspect ratio label, e.g. 9:16 */
  aspectRatio: string;
  /** Sequence duration in seconds (derived from clips, stored for export) */
  durationSeconds: number;
  frameRate: number;
  tracks: StudioTimelineTrack[];
  /** Future: captions blocks, AI edit proposals, render presets */
  extensions?: {
    captions?: unknown[];
    aiEdits?: unknown[];
    audioMix?: unknown;
  };
};
