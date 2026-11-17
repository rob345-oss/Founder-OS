import { describe, expect, it } from "vitest";

import { validateAssetsForPlatform } from "@/lib/marketing/server/social-media-rules";

describe("social media platform rules", () => {
  it("rejects mixing image and video on instagram", () => {
    const report = validateAssetsForPlatform("instagram", [
      {
        id: "a",
        assetType: "image",
        mimeType: "image/jpeg",
        byteSize: 1_000,
        width: 1080,
        height: 1080,
        durationSec: null,
      },
      {
        id: "b",
        assetType: "video",
        mimeType: "video/mp4",
        byteSize: 1_000,
        width: 1080,
        height: 1080,
        durationSec: 30,
      },
    ]);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "mixed_media")).toBe(true);
  });

  it("rejects unsupported mime on linkedin", () => {
    const report = validateAssetsForPlatform("linkedin", [
      {
        id: "a",
        assetType: "image",
        mimeType: "image/webp",
        byteSize: 1_000,
        width: 1200,
        height: 1200,
        durationSec: null,
      },
    ]);
    expect(report.ok).toBe(false);
  });
});