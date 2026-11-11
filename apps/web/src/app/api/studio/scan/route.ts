import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { scanAuthorizedDirectories } from "@/lib/studio/server/scanner";

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const result = await scanAuthorizedDirectories();
  return NextResponse.json({ result });
}
