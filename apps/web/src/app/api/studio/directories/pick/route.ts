import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { pickWindowsFolder } from "@/lib/studio/server/folder-picker";
import { validateAuthorizedDirectoryRegistration } from "@/lib/studio/server/media-root";

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;

  if (process.platform !== "win32") {
    return NextResponse.json(
      {
        error:
          "Native folder picker is available on Windows only. Paste an absolute folder path on other platforms.",
      },
      { status: 501 },
    );
  }

  const picked = await pickWindowsFolder();
  if (!picked) {
    return NextResponse.json({ cancelled: true });
  }

  const validation = validateAuthorizedDirectoryRegistration(picked);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  return NextResponse.json({ path: validation.path });
}
