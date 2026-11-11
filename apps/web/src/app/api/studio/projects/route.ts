import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import type { StudioProject } from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import {
  defaultProjectTitle,
  insertProject,
  newProjectId,
  readStudioIndex,
  setProjectMediaOrder,
} from "@/lib/studio/server/repository";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const snapshot = readStudioIndex();
  const projects = [...snapshot.projects].sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt));
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json()) as { title?: string; mediaIds?: string[] };
  const now = new Date().toISOString();
  const project: StudioProject = {
    id: newProjectId(),
    title: body.title?.trim() || defaultProjectTitle(),
    status: "draft",
    targetPlatform: "instagram_reels",
    aspectRatio: "9:16",
    thumbnailMediaId: body.mediaIds?.[0] ?? null,
    lastEditedAt: now,
    createdAt: now,
    mediaIds: body.mediaIds ?? [],
  };
  insertProject(project);
  if (body.mediaIds?.length) {
    setProjectMediaOrder(project.id, body.mediaIds);
  }
  return NextResponse.json({ project });
}
