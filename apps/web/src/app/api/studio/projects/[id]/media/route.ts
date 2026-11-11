import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { readStudioIndex, setProjectMediaOrder } from "@/lib/studio/server/repository";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const snapshot = readStudioIndex();
  if (!snapshot.projects.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = (await req.json()) as { mediaIds?: string[] };
  const mediaIds = body.mediaIds ?? [];
  setProjectMediaOrder(id, mediaIds);
  const project = readStudioIndex().projects.find((p) => p.id === id);
  return NextResponse.json({ project });
}
