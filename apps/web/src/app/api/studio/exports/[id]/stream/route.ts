import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { getExportJob } from "@/lib/studio/server/export-repository";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { isPathInsideRoot } from "@/lib/studio/server/paths";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const job = getExportJob(id);
  if (!job || job.status !== "completed" || !job.outputPath) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isPathInsideRoot(job.settings.outputDir, job.outputPath)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(job.outputPath);
    if (!stat.isFile()) return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const range = req.headers.get("range");
  const size = stat.size;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : size - 1;
      const chunk = fs.createReadStream(job.outputPath, { start, end });
      return new NextResponse(chunk as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }
  const stream = fs.createReadStream(job.outputPath);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}
