import type { SocialPlatformId } from "./social-types";

export const SOCIAL_MEDIA_ASSET_TYPES = ["image", "video", "other"] as const;
export type SocialMediaAssetType = (typeof SOCIAL_MEDIA_ASSET_TYPES)[number];

export const SOCIAL_MEDIA_UPLOAD_STATES = ["uploading", "ready", "failed"] as const;
export type SocialMediaUploadState = (typeof SOCIAL_MEDIA_UPLOAD_STATES)[number];

export type SocialMediaAsset = {
  id: string;
  title: string;
  description: string | null;
  altText: string | null;
  assetType: SocialMediaAssetType;
  storageUrl: string | null;
  storageKey: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  tags: string[];
  uploadState: SocialMediaUploadState;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Posts referencing this asset (library detail). */
  usedByPostIds?: string[];
};

export type SocialMediaAssetListQuery = {
  q?: string;
  assetType?: SocialMediaAssetType;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

export type SocialMediaAssetPatch = {
  title?: string;
  description?: string | null;
  altText?: string | null;
  tags?: string[];
  archivedAt?: string | null;
};

export type SocialPostMediaAttachment = {
  assetId: string;
  altText?: string | null;
  order: number;
};

export type MediaCompatibilityIssue = {
  code: string;
  message: string;
  assetId?: string;
};

export type MediaCompatibilityReport = {
  ok: boolean;
  issues: MediaCompatibilityIssue[];
  platform: SocialPlatformId;
};