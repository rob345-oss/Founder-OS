import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { commandExists, ensureTinyMp4 } from "./fixtures";
import { extractThumbnail, probeVideoFile } from "../ffprobe";

describe("studio ffprobe", () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("returns empty probe when ffprobe is unavailable", async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "studio-no-ffprobe-"));
    const fake = path.join(tmp, "missing.mp4");
    fs.writeFileSync(fake, "not a video");
    const probe = await probeVideoFile(fake);
    expect(probe.durationSeconds).toBeNull();
  });

  it("probes and thumbnails synthetic mp4 when ffmpeg is installed", async () => {
    const has = await commandExists("ffmpeg");
    if (!has) {
      console.warn("[test] ffmpeg not on PATH — skipping fixture probe");
      return;
    }

    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "studio-ffprobe-"));
    const mp4 = path.join(tmp, "fixture.mp4");
    const thumb = path.join(tmp, "thumb.jpg");
    const ok = await ensureTinyMp4(mp4);
    expect(ok).toBe(true);

    const probe = await probeVideoFile(mp4);
    expect(probe.width).toBe(320);
    expect(probe.durationSeconds).not.toBeNull();

    const thumbOk = await extractThumbnail(mp4, thumb);
    expect(thumbOk).toBe(true);
    expect(fs.statSync(thumb).size).toBeGreaterThan(100);
  });
});
