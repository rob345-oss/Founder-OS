import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { createSocialPost, listSocialPosts } from "@/lib/marketing/server/social-repository";
import type { SocialPlatformId, SocialPostStatus } from "@/lib/marketing/social-types";
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from "@/lib/marketing/social-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const sp = req.nextUrl.searchParams;
  const platform = sp.get("platform");
  const status = sp.get("status");
  const items = await listSocialPosts({
    platform:
      platform && (SOCIAL_PLATFORMS as readonly string[]).includes(platform)
        ? (platform as SocialPlatformId)
        : undefined,
    status:
      status && (SOCIAL_POST_STATUSES as readonly string[]).includes(status)
        ? (status as SocialPostStatus)
        : undefined,
    search: sp.get("q") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
  });
  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.platform || typeof body.platform !== "string" || !(SOCIAL_PLATFORMS as readonly string[]).includes(body.platform)) {
    return Response.json({ error: "platform is required" }, { status: 400 });
  }
  try {
    const created = await createSocialPost({
      platform: body.platform as SocialPlatformId,
      bodyText: typeof body.bodyText === "string" ? body.bodyText : "",
      internalLabel: typeof body.internalLabel === "string" ? body.internalLabel : null,
      campaignId: typeof body.campaignId === "string" ? body.campaignId : null,
      status: typeof body.status === "string" ? (body.status as SocialPostStatus) : undefined,
      scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
      publishedAt: typeof body.publishedAt === "string" ? body.publishedAt : null,
      platformPermalink: typeof body.platformPermalink === "string" ? body.platformPermalink : null,
      destinationUrl: typeof body.destinationUrl === "string" ? body.destinationUrl : null,
      ctaText: typeof body.ctaText === "string" ? body.ctaText : null,
      hashtags: typeof body.hashtags === "string" ? body.hashtags : null,
      topicTags: Array.isArray(body.topicTags) ? body.topicTags.map(String) : undefined,
      isManualTrackOnly: Boolean(body.isManualTrackOnly),
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed to create post" }, { status: 400 });
  }
}