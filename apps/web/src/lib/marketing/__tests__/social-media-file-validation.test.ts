import { describe, expect, it } from "vitest";

import { validateMarketingMediaUpload } from "@/lib/marketing/server/social-media-file-validation";

const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

describe("validateMarketingMediaUpload", () => {
  it("accepts jpeg content", () => {
    const meta = validateMarketingMediaUpload("photo.jpg", "image/jpeg", JPEG);
    expect(meta.assetType).toBe("image");
    expect(meta.mimeType).toBe("image/jpeg");
  });

  it("rejects mismatched declared mime", () => {
    expect(() => validateMarketingMediaUpload("photo.jpg", "image/png", JPEG)).toThrow(/content/);
  });
});