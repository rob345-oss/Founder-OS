import type { SocialMediaAssetType } from "../social-media-types";
import type { SocialPlatformId } from "../social-types";

/** Conservative limits aligned with common Meta / LinkedIn publishing APIs (internal scheduling). */
export type PlatformMediaRules = {
  maxAttachments: number;
  allowMixedImageVideo: boolean;
  carouselMax: number;
  image: {
    mimeTypes: string[];
    maxBytes: number;
    minAspect: number;
    maxAspect: number;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
  };
  video: {
    mimeTypes: string[];
    maxBytes: number;
    maxDurationSec: number;
    minDurationSec: number;
    minAspect: number;
    maxAspect: number;
  };
};

const MB = 1024 * 1024;

export const PLATFORM_MEDIA_RULES: Record<"instagram" | "facebook" | "linkedin", PlatformMediaRules> = {
  instagram: {
    maxAttachments: 10,
    allowMixedImageVideo: false,
    carouselMax: 10,
    image: {
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes: 8 * MB,
      minAspect: 0.8,
      maxAspect: 1.91,
      minWidth: 320,
      minHeight: 320,
      maxWidth: 8192,
      maxHeight: 8192,
    },
    video: {
      mimeTypes: ["video/mp4", "video/quicktime"],
      maxBytes: 100 * MB,
      maxDurationSec: 90,
      minDurationSec: 3,
      minAspect: 0.8,
      maxAspect: 1.91,
    },
  },
  facebook: {
    maxAttachments: 10,
    allowMixedImageVideo: false,
    carouselMax: 10,
    image: {
      mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maxBytes: 10 * MB,
      minAspect: 0.5,
      maxAspect: 2.0,
      minWidth: 200,
      minHeight: 200,
      maxWidth: 8192,
      maxHeight: 8192,
    },
    video: {
      mimeTypes: ["video/mp4", "video/quicktime"],
      maxBytes: 200 * MB,
      maxDurationSec: 240 * 60,
      minDurationSec: 1,
      minAspect: 0.5,
      maxAspect: 2.0,
    },
  },
  linkedin: {
    maxAttachments: 9,
    allowMixedImageVideo: false,
    carouselMax: 9,
    image: {
      mimeTypes: ["image/jpeg", "image/png", "image/gif"],
      maxBytes: 10 * MB,
      minAspect: 0.5,
      maxAspect: 2.0,
      minWidth: 400,
      minHeight: 400,
      maxWidth: 8192,
      maxHeight: 8192,
    },
    video: {
      mimeTypes: ["video/mp4", "video/quicktime"],
      maxBytes: 200 * MB,
      maxDurationSec: 30 * 60,
      minDurationSec: 3,
      minAspect: 0.5,
      maxAspect: 2.0,
    },
  },
};

export type MediaRuleAsset = {
  id: string;
  assetType: SocialMediaAssetType;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  uploadState?: string;
};

function aspect(width: number | null, height: number | null): number | null {
  if (width == null || height == null || height <= 0) return null;
  return width / height;
}

export function validateAssetsForPlatform(
  platform: SocialPlatformId,
  assets: MediaRuleAsset[],
): { ok: boolean; issues: { code: string; message: string; assetId?: string }[] } {
  const issues: { code: string; message: string; assetId?: string }[] = [];

  const rules = PLATFORM_MEDIA_RULES[platform as keyof typeof PLATFORM_MEDIA_RULES];
  if (!rules) {
    return { ok: true, issues: [] };
  }

  const ready = assets.filter((a) => a.uploadState !== "failed" && a.uploadState !== "uploading");
  if (ready.length > rules.maxAttachments) {
    issues.push({
      code: "too_many_attachments",
      message: `${platform} allows up to ${rules.maxAttachments} media attachments for this workflow.`,
    });
  }

  const images = ready.filter((a) => a.assetType === "image");
  const videos = ready.filter((a) => a.assetType === "video");
  if (images.length && videos.length && !rules.allowMixedImageVideo) {
    issues.push({
      code: "mixed_media",
      message: "This platform does not support mixing images and videos in one post. Remove one type.",
    });
  }

  if (images.length > 1 && images.length > rules.carouselMax) {
    issues.push({
      code: "carousel_limit",
      message: `Carousel is limited to ${rules.carouselMax} images on ${platform}.`,
    });
  }

  for (const asset of ready) {
    if (asset.uploadState === "uploading") {
      issues.push({
        code: "upload_incomplete",
        message: "Wait for uploads to finish before scheduling.",
        assetId: asset.id,
      });
      continue;
    }
    if (asset.assetType === "image") {
      const mime = asset.mimeType ?? "";
      if (mime && !rules.image.mimeTypes.includes(mime)) {
        issues.push({
          code: "unsupported_image_type",
          message: `${mime} is not supported for ${platform} images. Use ${rules.image.mimeTypes.join(", ")}.`,
          assetId: asset.id,
        });
      }
      if (asset.byteSize != null && asset.byteSize > rules.image.maxBytes) {
        issues.push({
          code: "image_too_large",
          message: `Image exceeds ${platform} size limit (${Math.round(rules.image.maxBytes / MB)} MB).`,
          assetId: asset.id,
        });
      }
      const ar = aspect(asset.width, asset.height);
      if (ar != null && (ar < rules.image.minAspect || ar > rules.image.maxAspect)) {
        issues.push({
          code: "image_aspect",
          message: `Image aspect ratio ${ar.toFixed(2)} is outside ${platform} recommended range.`,
          assetId: asset.id,
        });
      }
      if (asset.width != null && asset.height != null && asset.width < rules.image.minWidth) {
        issues.push({
          code: "image_width",
          message: `Image width must be at least ${rules.image.minWidth}px for ${platform}.`,
          assetId: asset.id,
        });
      }
    }
    if (asset.assetType === "video") {
      const mime = asset.mimeType ?? "";
      if (mime && !rules.video.mimeTypes.includes(mime)) {
        issues.push({
          code: "unsupported_video_type",
          message: `${mime} is not supported for ${platform} video. Use ${rules.video.mimeTypes.join(", ")}.`,
          assetId: asset.id,
        });
      }
      if (asset.byteSize != null && asset.byteSize > rules.video.maxBytes) {
        issues.push({
          code: "video_too_large",
          message: `Video exceeds ${platform} size limit (${Math.round(rules.video.maxBytes / MB)} MB).`,
          assetId: asset.id,
        });
      }
      if (asset.durationSec != null && asset.durationSec > rules.video.maxDurationSec) {
        issues.push({
          code: "video_duration",
          message: `Video duration exceeds ${platform} limit (${rules.video.maxDurationSec}s).`,
          assetId: asset.id,
        });
      }
      const ar = aspect(asset.width, asset.height);
      if (ar != null && (ar < rules.video.minAspect || ar > rules.video.maxAspect)) {
        issues.push({
          code: "video_aspect",
          message: `Video aspect ratio ${ar.toFixed(2)} is outside ${platform} recommended range.`,
          assetId: asset.id,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}