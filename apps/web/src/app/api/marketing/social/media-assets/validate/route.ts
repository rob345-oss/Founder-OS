import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { getSocialMediaAssetsByIds } from "@/lib/marketing/server/social-media-repository";
import { validateAssetsForPlatform } from "@/lib/marketing/server/social-media-rules";
import { SOCIAL_PLATFORMS, type SocialPlatformId } from "@/lib/marketing/social-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  const platform = body.platform;
  const assetIds = Array.isArray(body.assetIds) ? body.assetIds.map(String) : [];
  if (!platform || typeof platform !== "string" || !(SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
    return Response.json({ error: "platform is required" }, { status: 400 });
  }
  const assets = await getSocialMediaAssetsByIds(assetIds);
  const report = validateAssetsForPlatform(platform as SocialPlatformId, assets);
  return Response.json({ platform, ...report });
}