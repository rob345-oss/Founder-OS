import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { STUDIO_CONTENT_CATEGORIES, type StudioContentCategory } from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { toPublicMedia } from "@/lib/studio/server/public-map";
import { readStudioIndex } from "@/lib/studio/server/store";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = req.nextUrl.searchParams.get("category");
  const directoryId = req.nextUrl.searchParams.get("directoryId");

  const snapshot = readStudioIndex();
  let items = snapshot.media;

  if (directoryId) {
    items = items.filter((m) => m.directoryId === directoryId);
  }
  if (category && (STUDIO_CONTENT_CATEGORIES as readonly string[]).includes(category)) {
    items = items.filter((m) => m.category === (category as StudioContentCategory));
  }
  if (q) {
    items = items.filter(
      (m) =>
        m.fileName.toLowerCase().includes(q) ||
        m.relativePath.toLowerCase().includes(q),
    );
  }

  items = [...items].sort((a, b) => b.dateModified.localeCompare(a.dateModified));
  return NextResponse.json({
    items: items.map((m) => toPublicMedia(m, snapshot.directories)),
  });
}
