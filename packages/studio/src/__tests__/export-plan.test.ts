import { describe, expect, it } from "vitest";

import { STUDIO_EXPORT_PRESETS } from "../export";
import { buildExportPlanFromTimeline, buildFilterComplex, sanitizeExportFileName } from "../export-plan";
import { hydrateTimelineFromMediaIds } from "../timeline-ops";

describe("export plan", () => {
  it("sanitizes unsafe file names", () => {
    expect(sanitizeExportFileName('bad<>name|.mp4')).toBe("bad__name_.mp4");
  });

  it("builds sequential plan with trims", () => {
    const meta = new Map([
      ["a", { durationSeconds: 10, missing: false }],
      ["b", { durationSeconds: 8, missing: false }],
    ]);
    const timeline = hydrateTimelineFromMediaIds("p1", "T", "9:16", ["a", "b"], new Map(Array.from(meta, ([k, v]) => [k, v.durationSeconds])));
    timeline.tracks[0]!.clips[0]!.sourceInSeconds = 1;
    timeline.tracks[0]!.clips[0]!.sourceOutSeconds = 5;
    const preset = STUDIO_EXPORT_PRESETS.vertical_social;
    const built = buildExportPlanFromTimeline(timeline, preset, meta, 23);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.plan.segments).toHaveLength(2);
    expect(built.plan.segments[0]!.durationSeconds).toBe(4);
    expect(built.plan.totalDurationSeconds).toBe(12);
  });

  it("rejects missing media", () => {
    const meta = new Map([["a", { durationSeconds: 5, missing: true }]]);
    const timeline = hydrateTimelineFromMediaIds("p1", "T", "9:16", ["a"], new Map([["a", 5]]));
    const built = buildExportPlanFromTimeline(timeline, STUDIO_EXPORT_PRESETS.square, meta, 23);
    expect(built.ok).toBe(false);
  });

  it("builds filter graph for silent and audio clips", () => {
    const plan = {
      projectId: "p",
      preset: STUDIO_EXPORT_PRESETS.vertical_social,
      totalDurationSeconds: 6,
      crf: 23,
      segments: [
        {
          clipInstanceId: "c1",
          sourceMediaId: "a",
          sourceInSeconds: 0,
          sourceOutSeconds: 3,
          durationSeconds: 3,
          hasAudio: true,
        },
        {
          clipInstanceId: "c2",
          sourceMediaId: "b",
          sourceInSeconds: 0,
          sourceOutSeconds: 3,
          durationSeconds: 3,
          hasAudio: false,
        },
      ],
    };
    const fc = buildFilterComplex(plan);
    expect(fc).toContain("[0:a]atrim");
    expect(fc).toContain("anullsrc");
    expect(fc).toContain("concat=n=2");
  });
});
