import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import type { StudioTimelineProject } from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { loadProjectTimeline, readStudioIndex, saveProjectTimeline } from "@/lib/studio/server/repository";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!readStudioIndex().projects.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const timeline = loadProjectTimeline(id);
  if (!timeline) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ timeline });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!readStudioIndex().projects.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = (await req.json()) as { timeline?: StudioTimelineProject };
  if (!body.timeline || body.timeline.projectId !== id) {
    return NextResponse.json({ error: "Invalid timeline payload" }, { status: 400 });
  }
  const saved = saveProjectTimeline(body.timeline);
  return NextResponse.json({ timeline: saved });
}
