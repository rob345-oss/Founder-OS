import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { resolveIndexedMediaFile } from "@/lib/studio/server/media-file";
import { revealAuthorizedFile } from "@/lib/studio/server/reveal";
import { readStudioIndex } from "@/lib/studio/server/repository";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;

  const { id } = await params;
  const snapshot = readStudioIndex();
  const resolved = resolveIndexedMediaFile(snapshot, id);
  if (!resolved) {
    return NextResponse.json({ error: "File not found or offline." }, { status: 404 });
  }

  const ok = await revealAuthorizedFile(resolved.absolute);
  if (!ok) {
    return NextResponse.json({ error: "Reveal is only supported on Windows and macOS." }, { status: 501 });
  }

  return NextResponse.json({ ok: true });
}
