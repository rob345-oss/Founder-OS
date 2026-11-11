import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioMediaItem } from "@founder-os/studio";

describe("studio repository", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-studio-db-"));
    process.env.FOUNDER_OS_STUDIO_DATA_DIR = dataDir;
    // Reset module cache so db picks up new env
    vi.resetModules();
  });

  afterEach(async () => {
    const { closeStudioDb } = await import("../db");
    closeStudioDb();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* WAL lock on Windows */
    }
  });

  it("persists tags and ratings across patch", async () => {
    const { upsertDirectory, upsertMediaItem, patchMediaRecord, queryMedia, newDirectoryId } = await import(
      "../repository"
    );
    const dirId = newDirectoryId();
    upsertDirectory({
      id: dirId,
      label: "Test",
      rootPath: "C:\\Test\\Footage",
      addedAt: new Date().toISOString(),
      lastScannedAt: null,
    });

    const now = new Date().toISOString();
    const item: StudioMediaItem = {
      id: "abc123",
      directoryId: dirId,
      fileName: "hook-take-1.mp4",
      relativePath: "hook-take-1.mp4",
      kind: "video",
      fileSizeBytes: 1024,
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
      thumbnailKey: "abc123",
      pipelineStage: "imported",
      favorite: false,
      rating: null,
      reviewStatus: "unreviewed",
      takeNumber: 1,
      tags: [],
      notes: "",
      missing: false,
      projectId: null,
      ai: { analysisStatus: "unavailable" },
    };
    upsertMediaItem(item);

    const patched = patchMediaRecord("abc123", {
      rating: 5,
      reviewStatus: "selected",
      tags: ["Founder Story", "Hook"],
      notes: "Best delivery",
    });
    expect(patched?.rating).toBe(5);
    expect(patched?.tags).toEqual(["Founder Story", "Hook"]);

    const found = queryMedia({ q: "hook" });
    expect(found[0]?.notes).toBe("Best delivery");
  });
});
