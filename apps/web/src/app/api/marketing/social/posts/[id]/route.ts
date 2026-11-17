import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { assertPostMediaReady } from "@/lib/marketing/server/social-post-media-guard";
import {
  SocialPostConcurrencyError,
  deleteSocialPostDraft,
  duplicateSocialPost,
  getSocialPost,
  updateSocialPost,
} from "@/lib/marketing/server/social-repository";
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
    const existing = await getSocialPost(id);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
    const status =
      typeof body.status === "string" && (SOCIAL_POST_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as SocialPostStatus)
        : undefined;
    const mediaRefs = Array.isArray(body.mediaRefs) ? body.mediaRefs.map(String) : undefined;
    await assertPostMediaReady(
      existing.platform,
      status ?? existing.status,
      mediaRefs ?? existing.mediaRefs,
    );
    const updated = await updateSocialPost(id, {
      internalLabel: typeof body.internalLabel === "string" ? body.internalLabel : undefined,
      bodyText: typeof body.bodyText === "string" ? body.bodyText : undefined,
      status,
      scheduledAt: body.scheduledAt === null ? null : typeof body.scheduledAt === "string" ? body.scheduledAt : undefined,
      publishedAt: body.publishedAt === null ? null : typeof body.publishedAt === "string" ? body.publishedAt : undefined,
      platformPermalink: typeof body.platformPermalink === "string" ? body.platformPermalink : undefined,
      destinationUrl: typeof body.destinationUrl === "string" ? body.destinationUrl : undefined,
      hashtags: typeof body.hashtags === "string" ? body.hashtags : undefined,
      topicTags: Array.isArray(body.topicTags) ? body.topicTags.map(String) : undefined,
      mediaRefs,
      campaignId: typeof body.campaignId === "string" ? body.campaignId : body.campaignId === null ? null : undefined,
      expectedUpdatedAt: typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : undefined,
    });
    return Response.json(updated);
  } catch (e) {
    if (e instanceof SocialPostConcurrencyError) {
      return Response.json({ error: e.message }, { status: 409 });
    }
    return Response.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  try {
    await deleteSocialPostDraft(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action !== "duplicate") {
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  }
  try {
    const dup = await duplicateSocialPost(id);
    return Response.json(dup, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Duplicate failed" }, { status: 400 });
  }
}