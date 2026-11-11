import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import type { StudioStats } from "@/lib/studio/client-api";
import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { toPublicDirectory, toPublicMedia } from "@/lib/studio/server/public-map";
import { readStudioIndex } from "@/lib/studio/server/store";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const snapshot = readStudioIndex();
  const activeProjects = snapshot.projects.filter((p) => p.status !== "exported").length;
  const draftEdits = snapshot.projects.filter((p) => p.status === "draft" || p.status === "editing").length;
  const finishedExports = snapshot.projects.filter((p) => p.status === "exported").length;

  const stats: StudioStats = {
    videosInLibrary: snapshot.media.length,
    activeProjects,
    draftEdits,
    finishedExports,
    reusableOpportunities: snapshot.media.length > 0 ? null : null,
    demoMode: false,
  };

  const recentMedia = [...snapshot.media]
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    .slice(0, 8)
    .map((m) => toPublicMedia(m, snapshot.directories));

  const projects = [...snapshot.projects].sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt)).slice(0, 6);

  const categoryCounts: Record<string, number> = {};
  for (const m of snapshot.media) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  return NextResponse.json({
    stats,
    projects,
    recentMedia,
    directories: snapshot.directories.map(toPublicDirectory),
    categoryCounts,
  });
}
