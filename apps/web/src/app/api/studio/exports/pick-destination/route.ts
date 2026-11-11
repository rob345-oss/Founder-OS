import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { validateDirectoryPath } from "@/lib/studio/server/paths";
import { pickWindowsFolder } from "@/lib/studio/server/folder-picker";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const picked = await pickWindowsFolder();
  if (!picked) {
    return NextResponse.json({ cancelled: true });
  }
  const validated = validateDirectoryPath(picked);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  return NextResponse.json({ path: validated.path });
}
