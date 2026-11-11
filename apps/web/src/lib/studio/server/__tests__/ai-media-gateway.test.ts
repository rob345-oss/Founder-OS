import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioMediaItem } from "@founder-os/studio";

describe("ai media gateway", () => {
  let dataDir: string;
  let mediaRoot: string;
  let mediaId: string;

  beforeEach(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-ai-gw-"));
    mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-ai-media-"));
    process.env.FOUNDER_OS_STUDIO_DATA_DIR = dataDir;
    process.env.FOUNDER_OS_STUDIO_MEDIA_ROOT = mediaRoot;
    vi.resetModules();

    const rel = "hooks/take-01.mp4";
    fs.mkdirSync(path.dirname(path.join(mediaRoot, rel)), { recursive: true });
    fs.writeFileSync(path.join(mediaRoot, rel), "not-a-real-mp4-but-readable");

    const { newDirectoryId, upsertDirectory, upsertMediaItem, mediaIdForPath } = await import("../repository");
    const dirId = newDirectoryId();
    upsertDirectory({
      id: dirId,
      label: "Root",
      rootPath: mediaRoot,
      addedAt: new Date().toISOString(),
      lastScannedAt: null,
    });

    const now = new Date().toISOString();
    mediaId = mediaIdForPath(mediaRoot, rel);
    const item: StudioMediaItem = {
      id: mediaId,
      directoryId: dirId,
      fileName: "take-01.mp4",
      relativePath: rel,
      kind: "video",
      fileSizeBytes: 32,
      durationSeconds: 1,
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      frameRate: 30,
      codec: null,
      category: "hook",
      dateAdded: now,
      dateModified: now,
      dateIndexed: now,
      thumbnailKey: null,
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
  });

  afterEach(async () => {
    const { closeStudioDb } = await import("../db");
    closeStudioDb();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    delete process.env.FOUNDER_OS_STUDIO_MEDIA_ROOT;
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.rmSync(mediaRoot, { recursive: true, force: true });
    } catch {
      /* locks */
    }
  });

  it("allows read-only AI access inside the media root", async () => {
    const { readStudioIndex } = await import("../repository");
    const { authorizeAiMediaRead } = await import("../ai-media-gateway");
    const snapshot = readStudioIndex();
    const decision = authorizeAiMediaRead(snapshot, {
      mediaId,
      purpose: "classification",
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.maySendToExternalProvider).toBe(false);
    }
  });

  it("blocks external provider flag until privacy settings exist", async () => {
    const { readStudioIndex } = await import("../repository");
    const { authorizeAiMediaRead } = await import("../ai-media-gateway");
    const snapshot = readStudioIndex();
    const decision = authorizeAiMediaRead(snapshot, {
      mediaId,
      purpose: "transcript",
      allowExternalProvider: true,
    });
    expect(decision.allowed).toBe(false);
  });
});
