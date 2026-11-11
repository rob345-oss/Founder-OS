import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { getFfmpegStatus } from "@/lib/studio/server/ffmpeg-bin";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const status = await getFfmpegStatus();
  return NextResponse.json(status);
}
