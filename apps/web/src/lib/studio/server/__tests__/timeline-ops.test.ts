import { describe, expect, it } from "vitest";

import type { StudioTimelineClipInstance } from "@founder-os/studio";
import {
  buildSequenceSegments,
  duplicateClipInstance,
  hydrateTimelineFromMediaIds,
  refreshProjectDuration,
  computeProjectDuration,
  removeClipInstance,
  reorderClipInstances,
  resolveSequenceTime,
  updateClipTrim,
  validateClipTrim,
} from "@founder-os/studio";

function durations(map: Record<string, number | null>): Map<string, number | null> {
  return new Map(Object.entries(map));
}

describe("timeline ops", () => {
  it("exports refreshProjectDuration and keeps duration in sync with computeProjectDuration", () => {
    const d = durations({ a: 10, b: 5 });
    const base = hydrateTimelineFromMediaIds("p1", "Test", "9:16", ["a", "b"], d);
    const stale = { ...base, durationSeconds: 0 };
    const refreshed = refreshProjectDuration(stale, d);
    expect(refreshed.durationSeconds).toBe(computeProjectDuration(stale, d));
    expect(refreshed.durationSeconds).toBe(15);
  });

  it("hydrates ordered clips with sequential layout", () => {
    const d = durations({ a: 10, b: 5, c: 8 });
    const project = hydrateTimelineFromMediaIds("p1", "Test", "9:16", ["a", "b", "c"], d);
    expect(project.durationSeconds).toBe(23);
    const clips = project.tracks[0]!.clips;
    expect(clips[1]!.timelineStartSeconds).toBe(10);
    expect(clips[2]!.timelineStartSeconds).toBe(15);
  });

  it("validates trim boundaries", () => {
    const clip: StudioTimelineClipInstance = {
      id: "c1",
      order: 0,
      sourceMediaId: "a",
      sourceInSeconds: 2,
      sourceOutSeconds: 1,
      timelineStartSeconds: 0,
    };
    expect(validateClipTrim(clip, 10).ok).toBe(false);
  });

  it("reorders and duplicates without mutating source media", () => {
    const d = durations({ a: 4, b: 6 });
    let project = hydrateTimelineFromMediaIds("p1", "Test", "9:16", ["a", "b"], d);
    const firstId = project.tracks[0]!.clips[0]!.id;
    project = duplicateClipInstance(project, firstId, d);
    expect(project.tracks[0]!.clips).toHaveLength(3);
    const ids = project.tracks[0]!.clips.map((c) => c.id);
    project = reorderClipInstances(project, [ids[2]!, ids[0]!, ids[1]!], d);
    expect(project.tracks[0]!.clips[0]!.sourceMediaId).toBe("a");
    project = removeClipInstance(project, ids[1]!, d);
    expect(project.tracks[0]!.clips).toHaveLength(2);
  });

  it("resolves playback transitions across clips", () => {
    const d = durations({ a: 5, b: 3 });
    const project = hydrateTimelineFromMediaIds("p1", "Test", "9:16", ["a", "b"], d);
    const segments = buildSequenceSegments(project, d);
    const atBridge = resolveSequenceTime(4.9, segments);
    expect(atBridge?.segment.sourceMediaId).toBe("a");
    const nextClip = resolveSequenceTime(5.1, segments);
    expect(nextClip?.segment.sourceMediaId).toBe("b");
    expect(nextClip?.sourceTimeSeconds).toBeCloseTo(0.1, 1);
  });

  it("trims inside source duration", () => {
    const d = durations({ a: 10 });
    let project = hydrateTimelineFromMediaIds("p1", "Test", "9:16", ["a"], d);
    const clipId = project.tracks[0]!.clips[0]!.id;
    project = updateClipTrim(project, clipId, { sourceInSeconds: 2, sourceOutSeconds: 7 }, d);
    expect(project.durationSeconds).toBe(5);
  });
});
