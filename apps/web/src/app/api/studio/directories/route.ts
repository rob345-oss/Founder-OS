import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { validateDirectoryPath } from "@/lib/studio/server/paths";
import { toPublicDirectory } from "@/lib/studio/server/public-map";
import {
  directoryLabelFromPath,
  newDirectoryId,
  readStudioIndex,
  writeStudioIndex,
} from "@/lib/studio/server/store";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const snapshot = readStudioIndex();
  return NextResponse.json({
    directories: snapshot.directories.map(toPublicDirectory),
  });
}

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json()) as { path?: string; label?: string };
  const validation = validateDirectoryPath(body.path ?? "");
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const snapshot = readStudioIndex();
  if (snapshot.directories.some((d) => d.rootPath.toLowerCase() === validation.path.toLowerCase())) {
    return NextResponse.json({ error: "Directory already authorized." }, { status: 409 });
  }
  const directory = {
    id: newDirectoryId(),
    label: body.label?.trim() || directoryLabelFromPath(validation.path),
    rootPath: validation.path,
    addedAt: new Date().toISOString(),
    lastScannedAt: null,
  };
  snapshot.directories.push(directory);
  writeStudioIndex(snapshot);
  return NextResponse.json({ directory: toPublicDirectory(directory) });
}
