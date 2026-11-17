import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { closeMarketingSqliteForTests, resetMarketingSqliteForTests } from "@/lib/marketing/server/db";
import { createSocialPost, updateSocialPost } from "@/lib/marketing/server/social-repository";
import {
  deleteSocialMediaAsset,
  getSocialMediaAssetsByIds,
  ingestSocialMediaUpload,
  listSocialMediaAssets,
} from "@/lib/marketing/server/social-media-repository";
import { assertPostMediaReady } from "@/lib/marketing/server/social-post-media-guard";

// minimal valid JPEG
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

describe("social media repository (sqlite)", () => {
  let tmpDb: string;
  let mediaDir: string;

  afterEach(() => {
    closeMarketingSqliteForTests();
    if (tmpDb && fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const lib = mediaDir ? path.join(mediaDir, "marketing-media") : "";
    if (lib && fs.existsSync(lib)) fs.rmSync(lib, { recursive: true, force: true });
  });

  function boot() {
    mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcc-media-"));
    tmpDb = path.join(mediaDir, "marketing.db");
    delete process.env.CRM_DATABASE_URL;
    delete process.env.MARKETING_DATABASE_URL;
    process.env.MARKETING_DATA_DIR = mediaDir;
    resetMarketingSqliteForTests(tmpDb);
  }

  it("uploads image and lists in library", async () => {
    boot();
    const asset = await ingestSocialMediaUpload({
      filename: "hero.jpg",
      mimeType: "image/jpeg",
      buffer: JPEG,
    });
    expect(asset.uploadState).toBe("ready");
    const items = await listSocialMediaAssets();
    expect(items.some((i) => i.id === asset.id)).toBe(true);
    const byId = await getSocialMediaAssetsByIds([asset.id]);
    expect(byId[0]?.mimeType).toBe("image/jpeg");
  });

  it("persists media refs on draft and reopen", async () => {
    boot();
    const asset = await ingestSocialMediaUpload({
      filename: "post.jpg",
      mimeType: "image/jpeg",
      buffer: JPEG,
    });
    const post = await createSocialPost({
      platform: "linkedin",
      bodyText: "with media",
      status: "draft",
      mediaRefs: [asset.id],
    });
    expect(post.mediaRefs).toEqual([asset.id]);
    const scheduled = await updateSocialPost(post.id, {
      status: "scheduled",
      scheduledAt: new Date("2026-12-01T10:00:00Z").toISOString(),
    });
    expect(scheduled.mediaRefs).toEqual([asset.id]);
    await expect(assertPostMediaReady("youtube", "scheduled", scheduled.mediaRefs)).resolves.toBeUndefined();
  });

  it("blocks delete when referenced", async () => {
    boot();
    const asset = await ingestSocialMediaUpload({
      filename: "locked.jpg",
      mimeType: "image/jpeg",
      buffer: JPEG,
    });
    await createSocialPost({ platform: "facebook", status: "draft", mediaRefs: [asset.id] });
    await expect(deleteSocialMediaAsset(asset.id)).rejects.toThrow(/used by/);
  });

  it("rejects unsupported upload bytes", async () => {
    boot();
    await expect(
      ingestSocialMediaUpload({ filename: "bad.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") }),
    ).rejects.toThrow(/Unsupported/);
  });
});