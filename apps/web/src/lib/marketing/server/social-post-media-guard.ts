import type { SocialPlatformId, SocialPostStatus } from "../social-types";
import { getSocialMediaAssetsByIds } from "./social-media-repository";
import { validateAssetsForPlatform } from "./social-media-rules";

const REQUIRES_READY_MEDIA: SocialPostStatus[] = ["scheduled", "approved", "publishing", "published"];

export async function assertPostMediaReady(
  platform: SocialPlatformId,
  status: SocialPostStatus | undefined,
  mediaRefs: string[] | undefined,
): Promise<void> {
  const refs = mediaRefs ?? [];
  if (!status || !REQUIRES_READY_MEDIA.includes(status)) return;

  const assets = await getSocialMediaAssetsByIds(refs);
  const missing = refs.filter((id) => !assets.some((a) => a.id === id));
  if (missing.length) {
    throw new Error("Post references media that is missing from the library. Re-attach or remove broken references.");
  }
  const notReady = assets.filter((a) => a.uploadState !== "ready" || a.archivedAt);
  if (notReady.length) {
    throw new Error("All attachments must finish uploading and not be archived before scheduling or publishing.");
  }

  const report = validateAssetsForPlatform(platform, assets);
  if (!report.ok) {
    throw new Error(report.issues.map((i) => i.message).join(" "));
  }
}