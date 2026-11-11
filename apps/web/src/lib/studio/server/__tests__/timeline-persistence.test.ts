import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioMediaItem, StudioProject } from "@founder-os/studio";

describe("timeline persistence", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-studio-tl-"));
    process.env.FOUNDER_OS_STUDIO_DATA_DIR = dataDir;
    vi.resetModules();
  });

  afterEach(async () => {
    const { closeStudioDb } = await import("../db");
    closeStudioDb();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* windows wal */
    }
  });

  it("migrates schema and round-trips timeline JSON", async () => {
    const { upsertDirectory, upsertMediaItem, insertProject, loadProjectTimeline, saveProjectTimeline } = await import(
      "../repository"
    );
    const { newDirectoryId, newProjectId } = await import("../repository");

    const dirId = newDirectoryId();
    upsertDirectory({
      id: dirId,
      label: "Footage",
      rootPath: "C:\\Footage",
      addedAt: new Date().toISOString(),
      lastScannedAt: null,
    });

    const now = new Date().toISOString();
    const media: StudioMediaItem = {
      id: "vid1",
      directoryId: dirId,
      fileName: "hook.mp4",
      relativePath: "hook.mp4",
      kind: "video",
      fileSizeBytes: 1000,
      durationSeconds: 12,
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      frameRate: 30,
      codec: "h264",
      category: "hook",
      dateAdded: now,
      dateModified: now,
      dateIndexed: now,
      thumbnailKey: null,
      pipelineStage: "imported",
      favorite: false,
      rating: null,
      reviewStatus: "unreviewed",
      takeNumber: null,
      tags: [],
      notes: "",
      missing: false,
      projectId: null,
      ai: { analysisStatus: "unavailable" },
    };
    upsertMediaItem(media);

    const projectId = newProjectId();
    const project: StudioProject = {
      id: projectId,
      title: "Edit 1",
      status: "editing",
      targetPlatform: "tiktok",
      aspectRatio: "9:16",
      thumbnailMediaId: null,
      lastEditedAt: now,
      createdAt: now,
      mediaIds: ["vid1"],
    };
    insertProject(project);
    const { setProjectMediaOrder } = await import("../repository");
    setProjectMediaOrder(projectId, ["vid1"]);

    let timeline = loadProjectTimeline(projectId);
    expect(timeline?.tracks[0]?.clips).toHaveLength(1);
    const clipId = timeline!.tracks[0]!.clips[0]!.id;

    const { updateClipTrim } = await import("@founder-os/studio");
    timeline = updateClipTrim(timeline!, clipId, { sourceInSeconds: 1, sourceOutSeconds: 8 }, new Map([["vid1", 12]]));
    const saved = saveProjectTimeline(timeline!);

    const reloaded = loadProjectTimeline(projectId);
    expect(reloaded?.durationSeconds).toBe(saved.durationSeconds);
    expect(reloaded?.tracks[0]?.clips[0]?.sourceInSeconds).toBe(1);
  });
});
