import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { getSocialPost, updateSocialPost } from "@/lib/marketing/server/social-repository";
import type { SocialPostStatus } from "@/lib/marketing/social-types";
import { SOCIAL_POST_STATUSES } from "@/lib/marketing/social-types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const post = await getSocialPost(id);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(post);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const updated = await updateSocialPost(id, {
      internalLabel: typeof body.internalLabel === "string" ? body.internalLabel : undefined,
      bodyText: typeof body.bodyText === "string" ? body.bodyText : undefined,
      status:
        typeof body.status === "string" && (SOCIAL_POST_STATUSES as readonly string[]).includes(body.status)
          ? (body.status as SocialPostStatus)
          : undefined,
      scheduledAt: body.scheduledAt === null ? null : typeof body.scheduledAt === "string" ? body.scheduledAt : undefined,
      publishedAt: body.publishedAt === null ? null : typeof body.publishedAt === "string" ? body.publishedAt : undefined,
      platformPermalink: typeof body.platformPermalink === "string" ? body.platformPermalink : undefined,
      destinationUrl: typeof body.destinationUrl === "string" ? body.destinationUrl : undefined,
      hashtags: typeof body.hashtags === "string" ? body.hashtags : undefined,
      topicTags: Array.isArray(body.topicTags) ? body.topicTags.map(String) : undefined,
    });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 });
  }
}