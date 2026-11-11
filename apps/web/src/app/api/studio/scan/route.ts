import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { getActiveScanJob, getScanJob, requestScanCancel } from "@/lib/studio/server/repository";
import { scanAuthorizedDirectories, startScan } from "@/lib/studio/server/scanner";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const jobId = req.nextUrl.searchParams.get("jobId");
  const job = jobId ? getScanJob(jobId) : getActiveScanJob();
  return NextResponse.json({ job });
}

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    directoryId?: string;
    wait?: boolean;
    cancelJobId?: string;
  };

  if (body.cancelJobId) {
    requestScanCancel(body.cancelJobId);
    return NextResponse.json({ ok: true });
  }

  const directoryId = body.directoryId ?? null;
  const started = startScan(directoryId);
  if ("error" in started) {
    if (body.wait) {
      const result = await scanAuthorizedDirectories();
      return NextResponse.json({ result });
    }
    return NextResponse.json({ error: started.error }, { status: 409 });
  }

  if (body.wait) {
    const result = await scanAuthorizedDirectories();
    return NextResponse.json({ result, jobId: started.jobId });
  }

  return NextResponse.json({ jobId: started.jobId });
}
