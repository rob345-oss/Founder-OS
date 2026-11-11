import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  STUDIO_CONTENT_CATEGORIES,
  STUDIO_REVIEW_STATUSES,
  type StudioContentCategory,
  type StudioReviewStatus,
} from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { toPublicMedia } from "@/lib/studio/server/public-map";
import { addMediaToCollection, patchMediaRecord, readStudioIndex } from "@/lib/studio/server/repository";

type BulkBody = {
  ids: string[];
  patch?: {
    category?: string;
    reviewStatus?: string;
    favorite?: boolean;
    rating?: number | null;
    tags?: string[];
  };
  collectionId?: string;
};

export async function PATCH(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json()) as BulkBody;
  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const snapshot = readStudioIndex();
  const updated = [];
  const errors: { id: string; error: string }[] = [];

  for (const id of body.ids) {
    try {
      if (body.collectionId) {
        addMediaToCollection(body.collectionId, [id]);
      }

      if (body.patch) {
        const patch: Parameters<typeof patchMediaRecord>[1] = {};
        if (body.patch.category && (STUDIO_CONTENT_CATEGORIES as readonly string[]).includes(body.patch.category)) {
          patch.category = body.patch.category as StudioContentCategory;
        }
        if (
          body.patch.reviewStatus &&
          (STUDIO_REVIEW_STATUSES as readonly string[]).includes(body.patch.reviewStatus)
        ) {
          patch.reviewStatus = body.patch.reviewStatus as StudioReviewStatus;
        }
        if (body.patch.favorite !== undefined) patch.favorite = body.patch.favorite;
        if (body.patch.rating !== undefined) patch.rating = body.patch.rating;
        if (body.patch.tags) patch.tags = body.patch.tags;

        const item = patchMediaRecord(id, patch);
        if (item) updated.push(toPublicMedia(item, snapshot.directories));
        else errors.push({ id, error: "Not found" });
      }
    } catch (e) {
      errors.push({ id, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  return NextResponse.json({ updated, errors });
}
