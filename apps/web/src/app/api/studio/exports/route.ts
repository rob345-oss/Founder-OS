import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import type { StudioExportJobSettings, StudioExportPresetId } from "@founder-os/studio";

import { createQueuedExport } from "@/lib/studio/server/export-worker";
import { listExportJobs } from "@/lib/studio/server/export-repository";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  return NextResponse.json({ jobs: listExportJobs() });
}

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json()) as {
    projectId?: string;
    presetId?: StudioExportPresetId;
    settings?: StudioExportJobSettings;
  };
  if (!body.projectId || !body.presetId || !body.settings?.fileName) {
    return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
  }
  const settings: StudioExportJobSettings = {
    presetId: body.presetId,
    qualityId: body.settings.qualityId ?? "standard",
    fileName: body.settings.fileName,
    outputDir: body.settings.outputDir ?? "",
    overwrite: Boolean(body.settings.overwrite),
  };
  const result = createQueuedExport({
    projectId: body.projectId,
    presetId: body.presetId,
    settings,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ job: result });
}
