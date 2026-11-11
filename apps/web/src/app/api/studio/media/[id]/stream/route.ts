import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { resolveIndexedMediaFile } from "@/lib/studio/server/media-file";
import { readStudioIndex } from "@/lib/studio/server/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const snapshot = readStudioIndex();
  const resolved = resolveIndexedMediaFile(snapshot, id);
  if (!resolved) return new NextResponse("Not found", { status: 404 });
  const { absolute, stat } = resolved;
  const item = snapshot.media.find((m) => m.id === id)!;

  const range = req.headers.get("range");
  const size = stat.size;
  const ext = item.fileName.split(".").pop()?.toLowerCase();
  const mime =
    ext === "mov"
      ? "video/quicktime"
      : ext === "webm"
        ? "video/webm"
        : "video/mp4";

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : size - 1;
      if (start >= size || end >= size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      const chunk = fs.createReadStream(absolute, { start, end });
      return new NextResponse(chunk as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": mime,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = fs.createReadStream(absolute);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}
