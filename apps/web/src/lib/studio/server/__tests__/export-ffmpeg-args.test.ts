import { describe, expect, it } from "vitest";

import { STUDIO_EXPORT_PRESETS } from "@founder-os/studio";

import { buildFfmpegArgs } from "../export-runner";

describe("ffmpeg args", () => {
  it("uses argument array without shell metacharacters", () => {
    const plan = {
      projectId: "p",
      preset: STUDIO_EXPORT_PRESETS.landscape,
      totalDurationSeconds: 2,
      crf: 23,
      segments: [
        {
          clipInstanceId: "c1",
          sourceMediaId: "m",
          sourcePath: "C:\\footage\\clip.mp4",
          sourceInSeconds: 0,
          sourceOutSeconds: 2,
          durationSeconds: 2,
          hasAudio: false,
        },
      ],
    };
    const args = buildFfmpegArgs(plan, { ffmpeg: "ffmpeg", ffprobe: "ffprobe" }, "C:\\out\\temp.part.mp4");
    expect(args).toContain("-filter_complex");
    expect(args).not.toContain("&");
    expect(args).not.toContain("|");
    expect(args.filter((a) => a === "-i").length).toBe(1);
  });
});
