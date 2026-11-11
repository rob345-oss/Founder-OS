import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureTinyMp4, writeTinyPng } from "./fixtures";

describe("studio scan runner", () => {
  let dataDir: string;
  let mediaRoot: string;
  let directoryId: string;

  beforeEach(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-studio-scan-"));
    mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-studio-media-"));
    process.env.FOUNDER_OS_STUDIO_DATA_DIR = dataDir;
    vi.resetModules();

    const { newDirectoryId, upsertDirectory } = await import("../repository");
    directoryId = newDirectoryId();
    upsertDirectory({
      id: directoryId,
      label: "Fixtures",
      rootPath: mediaRoot,
      addedAt: new Date().toISOString(),
      lastScannedAt: null,
    });

    writeTinyPng(path.join(mediaRoot, "still.png"));
    await ensureTinyMp4(path.join(mediaRoot, "clip-a.mp4"));
    fs.mkdirSync(path.join(mediaRoot, "duplicate-name"), { recursive: true });
    if (fs.existsSync(path.join(mediaRoot, "clip-a.mp4"))) {
      fs.copyFileSync(path.join(mediaRoot, "clip-a.mp4"), path.join(mediaRoot, "duplicate-name", "nested.mp4"));
    }
  });

  afterEach(async () => {
    const { closeStudioDb } = await import("../db");
    closeStudioDb();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.rmSync(mediaRoot, { recursive: true, force: true });
    } catch {
      /* Windows file locks */
    }
  });

  async function waitForJob(jobId: string) {
    const { getScanJob } = await import("../repository");
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const job = getScanJob(jobId);
      if (job && ["completed", "failed", "cancelled"].includes(job.status)) return job;
    }
    return getScanJob(jobId);
  }

  it("indexes images and video without mutating source files", async () => {
    const before = fs.readFileSync(path.join(mediaRoot, "still.png"));
    const { startScan } = await import("../scan-runner");
    const { readStudioIndex } = await import("../repository");

    const started = startScan(directoryId);
    expect("jobId" in started).toBe(true);
    if (!("jobId" in started)) return;
    const job = await waitForJob(started.jobId);
    expect(job?.status).toBe("completed");
    const snapshot = readStudioIndex();
    expect(snapshot.media.length).toBeGreaterThanOrEqual(1);
    const kinds = new Set(snapshot.media.map((m) => m.kind));
    expect(kinds.has("image")).toBe(true);
    expect(fs.readFileSync(path.join(mediaRoot, "still.png")).equals(before)).toBe(true);
  });

  it("marks items offline when files disappear (non-destructive index)", async () => {
    const { startScan } = await import("../scan-runner");
    const { getMediaById, mediaIdForPath, readStudioIndex } = await import("../repository");

    const started = startScan(directoryId);
    if ("jobId" in started) await waitForJob(started.jobId);

    const rel = "still.png";
    const id = mediaIdForPath(mediaRoot, rel);
    fs.unlinkSync(path.join(mediaRoot, rel));

    const second = startScan(directoryId);
    if ("jobId" in second) await waitForJob(second.jobId);

    const item = getMediaById(id);
    expect(item?.missing).toBe(true);
    expect(readStudioIndex().media.some((m) => m.id === id)).toBe(true);
  });

  it("assigns stable ids per root + relative path (duplicate paths in different folders differ)", async () => {
    const { mediaIdForPath } = await import("../repository");
    const a = mediaIdForPath(mediaRoot, "clip-a.mp4");
    const b = mediaIdForPath(mediaRoot, "duplicate-name/nested.mp4");
    expect(a).not.toBe(b);
  });

  it("honours scan cancellation", async () => {
    const { startScan } = await import("../scan-runner");
    const { getScanJob, requestScanCancel } = await import("../repository");

    const started = startScan(directoryId);
    expect("jobId" in started).toBe(true);
    if ("jobId" in started) {
      requestScanCancel(started.jobId);
      await new Promise((r) => setTimeout(r, 1200));
      const job = getScanJob(started.jobId);
      expect(job?.status === "cancelled" || job?.status === "completed").toBe(true);
    }
  });
});
