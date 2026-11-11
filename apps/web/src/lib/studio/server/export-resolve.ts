import type { StudioTimelineProject } from "@founder-os/studio";
import {
  STUDIO_EXPORT_PRESETS,
  STUDIO_EXPORT_QUALITY_CRF,
  buildExportPlanFromTimeline,
  type ExportRenderPlan,
  type StudioExportJobSettings,
  type StudioExportPresetId,
} from "@founder-os/studio";

import { probeHasAudio } from "./ffprobe";
import type { FfmpegBinaries } from "./ffmpeg-bin";
import { resolveIndexedMediaFile } from "./media-file";
import { loadProjectTimeline, parseTimelineProject } from "./repository";
import { readStudioIndex } from "./repository";
import { getStudioDb } from "./db";

export function projectHasPersistedTimeline(projectId: string): boolean {
  const db = getStudioDb();
  const row = db.prepare("SELECT timeline_json FROM projects WHERE id = ?").get(projectId) as
    | { timeline_json: string | null }
    | undefined;
  if (!row) return false;
  const parsed = parseTimelineProject(row.timeline_json);
  return Boolean(parsed && parsed.projectId === projectId);
}

export async function resolveExportRenderPlan(
  projectId: string,
  presetId: StudioExportPresetId,
  settings: StudioExportJobSettings,
  bins: FfmpegBinaries,
): Promise<{ ok: true; plan: ExportRenderPlan; timeline: StudioTimelineProject } | { ok: false; errors: string[] }> {
  if (!projectHasPersistedTimeline(projectId)) {
    return { ok: false, errors: ["Save the project timeline before exporting."] };
  }
  const timeline = loadProjectTimeline(projectId);
  if (!timeline) {
    return { ok: false, errors: ["Project timeline not found."] };
  }
  const snapshot = readStudioIndex();
  const meta = new Map<string, { durationSeconds: number | null; missing: boolean }>();
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (!meta.has(clip.sourceMediaId)) {
        const item = snapshot.media.find((m) => m.id === clip.sourceMediaId);
        meta.set(clip.sourceMediaId, {
          durationSeconds: item?.durationSeconds ?? null,
          missing: item?.missing ?? true,
        });
      }
    }
  }
  const preset = STUDIO_EXPORT_PRESETS[presetId];
  const crf = STUDIO_EXPORT_QUALITY_CRF[settings.qualityId];
  const built = buildExportPlanFromTimeline(timeline, preset, meta, crf);
  if (!built.ok) return built;

  const errors: string[] = [];
  for (const seg of built.plan.segments) {
    const resolved = resolveIndexedMediaFile(snapshot, seg.sourceMediaId);
    if (!resolved) {
      errors.push(`Cannot access source file for media ${seg.sourceMediaId}.`);
      continue;
    }
    seg.sourcePath = resolved.absolute;
    seg.hasAudio = await probeHasAudio(resolved.absolute, bins.ffprobe);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, plan: built.plan, timeline };
}
