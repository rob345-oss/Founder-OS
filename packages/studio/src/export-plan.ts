import type { StudioTimelineProject } from "./timeline";
import {
  clipSequenceDuration,
  getPrimaryVideoTrack,
  validateClipTrim,
} from "./timeline-ops";
import type { StudioExportPreset } from "./export";

export type ExportPlanSegment = {
  clipInstanceId: string;
  sourceMediaId: string;
  /** Absolute host path — assigned server-side only */
  sourcePath?: string;
  sourceInSeconds: number;
  sourceOutSeconds: number;
  durationSeconds: number;
  hasAudio?: boolean;
};

export type ExportRenderPlan = {
  projectId: string;
  preset: StudioExportPreset;
  segments: ExportPlanSegment[];
  totalDurationSeconds: number;
  crf: number;
};

export function buildExportPlanFromTimeline(
  timeline: StudioTimelineProject,
  preset: StudioExportPreset,
  sourceMeta: ReadonlyMap<
    string,
    { durationSeconds: number | null; missing: boolean }
  >,
  crf: number,
): { ok: true; plan: ExportRenderPlan } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const clips = getPrimaryVideoTrack(timeline);
  if (!clips.length) {
    return { ok: false, errors: ["Timeline has no video clips to export."] };
  }
  const segments: ExportPlanSegment[] = [];
  for (const clip of clips) {
    const meta = sourceMeta.get(clip.sourceMediaId);
    if (!meta) {
      errors.push(`Unknown media id ${clip.sourceMediaId}.`);
      continue;
    }
    if (meta.missing) {
      errors.push(`Source media ${clip.sourceMediaId} is missing on disk.`);
    }
    const trim = validateClipTrim(clip, meta.durationSeconds);
    if (!trim.ok) {
      errors.push(`${clip.id}: ${trim.reason}`);
    }
    const duration = clipSequenceDuration(clip, meta.durationSeconds);
    const sourceOut =
      clip.sourceOutSeconds ?? meta.durationSeconds ?? clip.sourceInSeconds + duration;
    segments.push({
      clipInstanceId: clip.id,
      sourceMediaId: clip.sourceMediaId,
      sourceInSeconds: clip.sourceInSeconds,
      sourceOutSeconds: sourceOut,
      durationSeconds: duration,
    });
  }
  if (errors.length) return { ok: false, errors };
  const total = segments.reduce((s, x) => s + x.durationSeconds, 0);
  return {
    ok: true,
    plan: {
      projectId: timeline.projectId,
      preset,
      segments,
      totalDurationSeconds: total,
      crf,
    },
  };
}

/** Builds FFmpeg filter_complex video+audio chains (no I/O paths). */
export function buildFilterComplex(plan: ExportRenderPlan): string {
  const { preset, segments } = plan;
  const w = preset.width;
  const h = preset.height;
  const fps = preset.frameRate;
  const parts: string[] = [];
  const vLabels: string[] = [];
  const aLabels: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const vin = `[${i}:v]`;
    const vout = `v${i}`;
    parts.push(
      `${vin}trim=start=${seg.sourceInSeconds}:end=${seg.sourceOutSeconds},setpts=PTS-STARTPTS,` +
        `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,` +
        `fps=${fps},format=yuv420p[${vout}]`,
    );
    vLabels.push(`[${vout}]`);

    const ain = `[${i}:a]`;
    const aout = `a${i}`;
    if (seg.hasAudio) {
      parts.push(
        `${ain}atrim=start=${seg.sourceInSeconds}:end=${seg.sourceOutSeconds},asetpts=PTS-STARTPTS,aresample=48000[${aout}]`,
      );
    } else {
      parts.push(
        `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=0:${seg.durationSeconds},asetpts=PTS-STARTPTS[${aout}]`,
      );
    }
    aLabels.push(`[${aout}]`);
  }

  const n = segments.length;
  parts.push(
    `${vLabels.join("")}concat=n=${n}:v=1:a=0[vcat];${aLabels.join("")}concat=n=${n}:v=0:a=1[acat]`,
  );
  return parts.join(";");
}

export function sanitizeExportFileName(input: string): string {
  const leaf = input.trim().split(/[/\\]/).pop() ?? "export";
  const base = leaf.replace(/[<>:"|?*\x00-\x1f]/g, "_");
  const withExt = base.toLowerCase().endsWith(".mp4") ? base : `${base.replace(/\.+$/g, "")}.mp4`;
  return withExt.slice(0, 160) || "export.mp4";
}
