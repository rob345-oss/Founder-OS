import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

import { thumbnailPath } from "@/lib/studio/server/data-dir";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { resolveIndexedMediaFile } from "@/lib/studio/server/media-file";
import { findMedia, readStudioIndex } from "@/lib/studio/server/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const snapshot = readStudioIndex();
  const item = findMedia(snapshot, id);
  if (!item?.thumbnailKey) {
    return new NextResponse(null, { status: 404 });
  }
  const file = thumbnailPath(item.thumbnailKey);
  if (!fs.existsSync(file)) {
    return new NextResponse(null, { status: 404 });
  }
  const buf = fs.readFileSync(file);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
