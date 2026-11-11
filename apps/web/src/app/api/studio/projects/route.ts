import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import type { StudioProject } from "@founder-os/studio";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import {
  defaultProjectTitle,
  newProjectId,
  readStudioIndex,
  writeStudioIndex,
} from "@/lib/studio/server/store";

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
  const body = (await req.json()) as { title?: string };
  const now = new Date().toISOString();
  const project: StudioProject = {
    id: newProjectId(),
    title: body.title?.trim() || defaultProjectTitle(),
    status: "draft",
    targetPlatform: "instagram_reels",
    aspectRatio: "9:16",
    thumbnailMediaId: null,
    lastEditedAt: now,
    createdAt: now,
  };
  const snapshot = readStudioIndex();
  snapshot.projects.unshift(project);
  writeStudioIndex(snapshot);
  return NextResponse.json({ project });
}
