import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { ingestSocialMediaUpload, listSocialMediaAssets } from "@/lib/marketing/server/social-media-repository";
import { SOCIAL_MEDIA_ASSET_TYPES, type SocialMediaAssetType } from "@/lib/marketing/social-media-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const sp = req.nextUrl.searchParams;
  const assetType = sp.get("type");
  const items = await listSocialMediaAssets({
    q: sp.get("q") ?? undefined,
    assetType:
      assetType && (SOCIAL_MEDIA_ASSET_TYPES as readonly string[]).includes(assetType)
        ? (assetType as SocialMediaAssetType)
        : undefined,
    includeArchived: sp.get("includeArchived") === "1",
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
  });
  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart form upload." }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file field." }, { status: 400 });
  }

  const altText = form.get("altText");
  const title = form.get("title");

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const created = await ingestSocialMediaUpload({
      filename: file.name,
      mimeType: file.type || null,
      buffer,
      title: typeof title === "string" ? title : undefined,
      altText: typeof altText === "string" ? altText : null,
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}