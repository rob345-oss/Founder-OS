import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { getExportJob } from "@/lib/studio/server/export-repository";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { isPathInsideRoot } from "@/lib/studio/server/paths";
import { revealAuthorizedFile } from "@/lib/studio/server/reveal";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const job = getExportJob(id);
  if (!job?.outputPath || job.status !== "completed") {
    return NextResponse.json({ ok: false, error: "Export output not available." }, { status: 404 });
  }
  if (!isPathInsideRoot(job.settings.outputDir, job.outputPath)) {
    return NextResponse.json({ ok: false, error: "Access denied." }, { status: 403 });
  }
  if (!fs.existsSync(job.outputPath)) {
    return NextResponse.json({ ok: false, error: "File missing on disk." }, { status: 404 });
  }
  const ok = await revealAuthorizedFile(job.outputPath);
  return NextResponse.json({ ok });
}
