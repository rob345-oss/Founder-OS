import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildFfmpegArgs } from "../export-runner";
import { STUDIO_EXPORT_PRESETS } from "@founder-os/studio";
import { locateFfmpegBinaries } from "../ffmpeg-bin";
import { probeOutputFile } from "../ffprobe";

function hasFfmpeg(): Promise<boolean> {
  return locateFfmpegBinaries().then((b) => Boolean(b));
}

function synthVideo(out: string, withAudio: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = withAudio
      ? [
          "-f",
          "lavfi",
          "-i",
          "testsrc=duration=2:size=320x240:rate=30",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=2",
          "-shortest",
          "-y",
          out,
        ]
      : ["-f", "lavfi", "-i", "testsrc=duration=2:size=640x480:rate=24", "-y", out];
    const p = spawn("ffmpeg", args, { shell: false });
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg synth ${c}`))));
  });
}

describe("export integration", () => {
  it("renders a short mp4 when ffmpeg is available", async () => {
    if (!(await hasFfmpeg())) return;
    const bins = await locateFfmpegBinaries();
    if (!bins) return;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fos-exp-int-"));
    const v1 = path.join(dir, "a.mp4");
    const v2 = path.join(dir, "b.mp4");
    const out = path.join(dir, "out.mp4");
    await synthVideo(v1, true);
    await synthVideo(v2, false);

    const plan = {
      projectId: "p",
      preset: STUDIO_EXPORT_PRESETS.vertical_social,
      totalDurationSeconds: 3,
      crf: 28,
      segments: [
        {
          clipInstanceId: "1",
          sourceMediaId: "a",
          sourcePath: v1,
          sourceInSeconds: 0.5,
          sourceOutSeconds: 1.5,
          durationSeconds: 1,
          hasAudio: true,
        },
        {
          clipInstanceId: "2",
          sourceMediaId: "b",
          sourcePath: v2,
          sourceInSeconds: 0,
          sourceOutSeconds: 2,
          durationSeconds: 2,
          hasAudio: false,
        },
      ],
    };

  const args = buildFfmpegArgs(plan, bins, out);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bins.ffmpeg, args, { shell: false });
      let err = "";
      proc.stderr.on("data", (c) => {
        err += c.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || String(code)))));
    });

    expect(fs.existsSync(out)).toBe(true);
    const probed = await probeOutputFile(out, bins.ffprobe);
    expect(probed.durationSeconds).not.toBeNull();
    expect((probed.durationSeconds ?? 0) > 0.5).toBe(true);
  }, 120_000);
});
