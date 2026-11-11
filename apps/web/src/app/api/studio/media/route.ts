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
import { queryMedia, readStudioIndex } from "@/lib/studio/server/repository";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? undefined;
  const categoryParam = req.nextUrl.searchParams.get("category") ?? undefined;
  const directoryId = req.nextUrl.searchParams.get("directoryId") ?? undefined;
  const kind = req.nextUrl.searchParams.get("kind") as "video" | "image" | null;
  const favorite = req.nextUrl.searchParams.get("favorite") === "1";
  const reviewStatusParam = req.nextUrl.searchParams.get("reviewStatus") ?? undefined;
  const collectionId = req.nextUrl.searchParams.get("collectionId") ?? undefined;
  const sort = (req.nextUrl.searchParams.get("sort") ?? "modified_desc") as
    | "modified_desc"
    | "modified_asc"
    | "name"
    | "duration"
    | "size"
    | "rating";
  const recent = req.nextUrl.searchParams.get("recent");

  let category: StudioContentCategory | undefined;
  if (categoryParam && (STUDIO_CONTENT_CATEGORIES as readonly string[]).includes(categoryParam)) {
    category = categoryParam as StudioContentCategory;
  }

  let reviewStatus: StudioReviewStatus | undefined;
  if (reviewStatusParam && (STUDIO_REVIEW_STATUSES as readonly string[]).includes(reviewStatusParam)) {
    reviewStatus = reviewStatusParam as StudioReviewStatus;
  }

  const items = queryMedia({
    q,
    category,
    directoryId,
    kind: kind === "video" || kind === "image" ? kind : undefined,
    favorite: favorite || undefined,
    reviewStatus,
    collectionId,
    sort,
    recentDays: recent === "1" ? 14 : undefined,
  });

  const snapshot = readStudioIndex();
  return NextResponse.json({
    items: items.map((m) => toPublicMedia(m, snapshot.directories)),
  });
}
