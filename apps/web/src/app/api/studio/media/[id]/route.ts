import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  STUDIO_CONTENT_CATEGORIES,
  STUDIO_PIPELINE_STAGES,
  STUDIO_REVIEW_STATUSES,
  type StudioContentCategory,
  type StudioPipelineStage,
  type StudioReviewStatus,
} from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { toPublicMedia } from "@/lib/studio/server/public-map";
import { getMediaById, patchMediaRecord, readStudioIndex } from "@/lib/studio/server/repository";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const item = getMediaById(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const snapshot = readStudioIndex();
  return NextResponse.json({ item: toPublicMedia(item, snapshot.directories) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    category?: string;
    pipelineStage?: string;
    favorite?: boolean;
    rating?: number | null;
    reviewStatus?: string;
    takeNumber?: number | null;
    notes?: string;
    tags?: string[];
    projectId?: string | null;
  };

  const patch: Parameters<typeof patchMediaRecord>[1] = {};
  if (body.category && (STUDIO_CONTENT_CATEGORIES as readonly string[]).includes(body.category)) {
    patch.category = body.category as StudioContentCategory;
  }
  if (body.pipelineStage && (STUDIO_PIPELINE_STAGES as readonly string[]).includes(body.pipelineStage)) {
    patch.pipelineStage = body.pipelineStage as StudioPipelineStage;
  }
  if (body.reviewStatus && (STUDIO_REVIEW_STATUSES as readonly string[]).includes(body.reviewStatus)) {
    patch.reviewStatus = body.reviewStatus as StudioReviewStatus;
  }
  if (body.favorite !== undefined) patch.favorite = body.favorite;
  if (body.rating !== undefined) patch.rating = body.rating;
  if (body.takeNumber !== undefined) patch.takeNumber = body.takeNumber;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.tags !== undefined) patch.tags = body.tags;
  if (body.projectId !== undefined) patch.projectId = body.projectId;

  const item = patchMediaRecord(id, patch);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const snapshot = readStudioIndex();
  return NextResponse.json({ item: toPublicMedia(item, snapshot.directories) });
}
