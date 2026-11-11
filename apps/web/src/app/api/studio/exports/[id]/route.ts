import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { getExportJob, requestExportCancel } from "@/lib/studio/server/export-repository";
import { cancelActiveExport, getActiveExportJobId } from "@/lib/studio/server/export-runner";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const job = getExportJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json()) as { action?: string };
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  const job = getExportJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return NextResponse.json({ job });
  }
  requestExportCancel(id);
  if (getActiveExportJobId() === id) {
    cancelActiveExport();
  }
  return NextResponse.json({ job: getExportJob(id) });
}
