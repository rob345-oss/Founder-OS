import type { StudioTimelineClipInstance, StudioTimelineProject } from "./timeline";

export const DEFAULT_VIDEO_TRACK_ID = "track-video-1";
export const DEFAULT_FRAME_RATE = 30;
export const MIN_TRIM_SECONDS = 0.05;

export function newClipInstanceId(): string {
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Active duration of one clip instance on the sequence (seconds). */
export function clipSequenceDuration(
  clip: StudioTimelineClipInstance,
  sourceDurationSeconds: number | null,
): number {
  const sourceEnd = clip.sourceOutSeconds ?? sourceDurationSeconds ?? 0;
  return Math.max(0, sourceEnd - clip.sourceInSeconds);
}

export function computeProjectDuration(
  project: StudioTimelineProject,
  sourceDurations: ReadonlyMap<string, number | null>,
): number {
  let max = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const dur = clipSequenceDuration(clip, sourceDurations.get(clip.sourceMediaId) ?? null);
      max = Math.max(max, clip.timelineStartSeconds + dur);
    }
  }
  return max;
}

export function validateClipTrim(
  clip: StudioTimelineClipInstance,
  sourceDurationSeconds: number | null,
): { ok: true } | { ok: false; reason: string } {
  const max = sourceDurationSeconds ?? Number.POSITIVE_INFINITY;
  if (clip.sourceInSeconds < 0) return { ok: false, reason: "Trim in-point cannot be before 0." };
  const out = clip.sourceOutSeconds ?? max;
  if (out - clip.sourceInSeconds < MIN_TRIM_SECONDS) {
    return { ok: false, reason: `Clip must be at least ${MIN_TRIM_SECONDS}s long.` };
  }
  if (sourceDurationSeconds != null && clip.sourceInSeconds > sourceDurationSeconds) {
    return { ok: false, reason: "Trim in-point is past the end of source media." };
  }
  if (sourceDurationSeconds != null && out > sourceDurationSeconds + 0.05) {
    return { ok: false, reason: "Trim out-point exceeds source media duration." };
  }
  return { ok: true };
}

export function getPrimaryVideoTrack(project: StudioTimelineProject): StudioTimelineClipInstance[] {
  const track =
    project.tracks.find((t) => t.kind === "video" && t.id === DEFAULT_VIDEO_TRACK_ID) ??
    project.tracks.find((t) => t.kind === "video");
  return track ? [...track.clips].sort((a, b) => a.order - b.order) : [];
}

export function withPrimaryVideoClips(
  project: StudioTimelineProject,
  clips: StudioTimelineClipInstance[],
): StudioTimelineProject {
  const tracks = project.tracks.map((t) => {
    if (t.kind !== "video") return t;
    if (t.id !== DEFAULT_VIDEO_TRACK_ID && project.tracks.some((x) => x.id === DEFAULT_VIDEO_TRACK_ID)) {
      return t;
    }
    return { ...t, clips };
  });
  if (!tracks.some((t) => t.id === DEFAULT_VIDEO_TRACK_ID)) {
    tracks.unshift({
      id: DEFAULT_VIDEO_TRACK_ID,
      kind: "video",
      label: "Video",
      clips,
    });
  }
  return { ...project, tracks };
}

/** Lay clips end-to-end on the primary video track (order defines sequence). */
export function layoutSequential(
  clips: StudioTimelineClipInstance[],
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineClipInstance[] {
  let cursor = 0;
  return clips
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((clip, index) => {
      const dur = clipSequenceDuration(clip, sourceDurations.get(clip.sourceMediaId) ?? null);
      const laid = { ...clip, order: index, timelineStartSeconds: cursor };
      cursor += dur;
      return laid;
    });
}

export function refreshProjectDuration(
  project: StudioTimelineProject,
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  return { ...project, durationSeconds: computeProjectDuration(project, sourceDurations) };
}

export function hydrateTimelineFromMediaIds(
  projectId: string,
  title: string,
  aspectRatio: string,
  mediaIds: string[],
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const clips: StudioTimelineClipInstance[] = mediaIds.map((sourceMediaId, order) => ({
    id: newClipInstanceId(),
    order,
    sourceMediaId,
    sourceInSeconds: 0,
    sourceOutSeconds: null,
    timelineStartSeconds: 0,
  }));
  const laid = layoutSequential(clips, sourceDurations);
  let project: StudioTimelineProject = {
    schemaVersion: 1,
    projectId,
    title,
    aspectRatio,
    durationSeconds: 0,
    frameRate: DEFAULT_FRAME_RATE,
    tracks: [
      {
        id: DEFAULT_VIDEO_TRACK_ID,
        kind: "video",
        label: "Video",
        clips: laid,
      },
    ],
  };
  project = refreshProjectDuration(project, sourceDurations);
  return project;
}

export function createClipFromMedia(sourceMediaId: string, order: number): StudioTimelineClipInstance {
  return {
    id: newClipInstanceId(),
    order,
    sourceMediaId,
    sourceInSeconds: 0,
    sourceOutSeconds: null,
    timelineStartSeconds: 0,
  };
}

export function addMediaToTimeline(
  project: StudioTimelineProject,
  sourceMediaIds: string[],
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const existing = getPrimaryVideoTrack(project);
  const startOrder = existing.length;
  const appended = sourceMediaIds.map((id, i) => createClipFromMedia(id, startOrder + i));
  const merged = layoutSequential([...existing, ...appended], sourceDurations);
  return refreshProjectDuration(withPrimaryVideoClips(project, merged), sourceDurations);
}

export function removeClipInstance(
  project: StudioTimelineProject,
  clipInstanceId: string,
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const existing = getPrimaryVideoTrack(project).filter((c) => c.id !== clipInstanceId);
  const merged = layoutSequential(existing, sourceDurations);
  return refreshProjectDuration(withPrimaryVideoClips(project, merged), sourceDurations);
}

export function duplicateClipInstance(
  project: StudioTimelineProject,
  clipInstanceId: string,
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const existing = getPrimaryVideoTrack(project);
  const index = existing.findIndex((c) => c.id === clipInstanceId);
  if (index < 0) return project;
  const source = existing[index]!;
  const copy: StudioTimelineClipInstance = {
    ...source,
    id: newClipInstanceId(),
  };
  const next = [...existing.slice(0, index + 1), copy, ...existing.slice(index + 1)];
  const merged = layoutSequential(next, sourceDurations);
  return refreshProjectDuration(withPrimaryVideoClips(project, merged), sourceDurations);
}

export function reorderClipInstances(
  project: StudioTimelineProject,
  orderedInstanceIds: string[],
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const map = new Map(getPrimaryVideoTrack(project).map((c) => [c.id, c]));
  const reordered = orderedInstanceIds.map((id) => map.get(id)).filter((c): c is StudioTimelineClipInstance => Boolean(c));
  if (reordered.length !== map.size) return project;
  const merged = layoutSequential(reordered, sourceDurations);
  return refreshProjectDuration(withPrimaryVideoClips(project, merged), sourceDurations);
}

export function updateClipTrim(
  project: StudioTimelineProject,
  clipInstanceId: string,
  patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null },
  sourceDurations: ReadonlyMap<string, number | null>,
): StudioTimelineProject {
  const existing = getPrimaryVideoTrack(project).map((c) => {
    if (c.id !== clipInstanceId) return c;
    return {
      ...c,
      sourceInSeconds: patch.sourceInSeconds ?? c.sourceInSeconds,
      sourceOutSeconds: patch.sourceOutSeconds !== undefined ? patch.sourceOutSeconds : c.sourceOutSeconds,
    };
  });
  const merged = layoutSequential(existing, sourceDurations);
  return refreshProjectDuration(withPrimaryVideoClips(project, merged), sourceDurations);
}

export type SequenceClipSegment = {
  clipInstanceId: string;
  sourceMediaId: string;
  timelineStartSeconds: number;
  timelineEndSeconds: number;
  sourceInSeconds: number;
  sourceOutSeconds: number;
};

export function buildSequenceSegments(
  project: StudioTimelineProject,
  sourceDurations: ReadonlyMap<string, number | null>,
): SequenceClipSegment[] {
  return getPrimaryVideoTrack(project).map((clip) => {
    const dur = clipSequenceDuration(clip, sourceDurations.get(clip.sourceMediaId) ?? null);
    const sourceEnd = clip.sourceOutSeconds ?? sourceDurations.get(clip.sourceMediaId) ?? clip.sourceInSeconds + dur;
    return {
      clipInstanceId: clip.id,
      sourceMediaId: clip.sourceMediaId,
      timelineStartSeconds: clip.timelineStartSeconds,
      timelineEndSeconds: clip.timelineStartSeconds + dur,
      sourceInSeconds: clip.sourceInSeconds,
      sourceOutSeconds: typeof sourceEnd === "number" ? sourceEnd : clip.sourceInSeconds + dur,
    };
  });
}

export function resolveSequenceTime(
  timelineSeconds: number,
  segments: SequenceClipSegment[],
): { segment: SequenceClipSegment; sourceTimeSeconds: number } | null {
  for (const segment of segments) {
    if (timelineSeconds >= segment.timelineStartSeconds && timelineSeconds < segment.timelineEndSeconds - 1e-6) {
      const offset = timelineSeconds - segment.timelineStartSeconds;
      return { segment, sourceTimeSeconds: segment.sourceInSeconds + offset };
    }
  }
  if (segments.length) {
    const last = segments[segments.length - 1]!;
    if (timelineSeconds >= last.timelineEndSeconds - 1e-6) {
      return { segment: last, sourceTimeSeconds: last.sourceOutSeconds - 0.001 };
    }
  }
  return null;
}

export function formatTimecode(seconds: number, frameRate = DEFAULT_FRAME_RATE): string {
  const safe = Math.max(0, seconds);
  const whole = Math.floor(safe);
  const frames = Math.floor((safe - whole) * frameRate);
  const s = whole % 60;
  const m = Math.floor(whole / 60) % 60;
  const h = Math.floor(whole / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}
