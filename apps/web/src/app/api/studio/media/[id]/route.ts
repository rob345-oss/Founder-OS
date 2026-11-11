import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { STUDIO_CONTENT_CATEGORIES, STUDIO_PIPELINE_STAGES } from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { toPublicMedia } from "@/lib/studio/server/public-map";
import { findMedia, readStudioIndex, writeStudioIndex } from "@/lib/studio/server/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json()) as { category?: string; pipelineStage?: string };
  const snapshot = readStudioIndex();
  const item = findMedia(snapshot, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.category && (STUDIO_CONTENT_CATEGORIES as readonly string[]).includes(body.category)) {
    item.category = body.category as typeof item.category;
  }
  if (body.pipelineStage && (STUDIO_PIPELINE_STAGES as readonly string[]).includes(body.pipelineStage)) {
    item.pipelineStage = body.pipelineStage as typeof item.pipelineStage;
  }
  writeStudioIndex(snapshot);
  return NextResponse.json({ item: toPublicMedia(item, snapshot.directories) });
}
