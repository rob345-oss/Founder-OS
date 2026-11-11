import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { validateDirectoryPath } from "@/lib/studio/server/paths";
import { toPublicDirectory } from "@/lib/studio/server/public-map";
import {
  deleteDirectory,
  directoryLabelFromPath,
  newDirectoryId,
  readStudioIndex,
  upsertDirectory,
} from "@/lib/studio/server/repository";
import { startScan } from "@/lib/studio/server/scanner";

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
  const body = (await req.json()) as { path?: string; label?: string; scan?: boolean };
  const validation = validateDirectoryPath(body.path ?? "");
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const snapshot = readStudioIndex();
  const existing = snapshot.directories.find(
    (d) => d.rootPath.toLowerCase() === validation.path.toLowerCase(),
  );
  if (existing) {
    return NextResponse.json({ directory: toPublicDirectory(existing), error: "Directory already authorized." }, { status: 409 });
  }

  const directory = {
    id: newDirectoryId(),
    label: body.label?.trim() || directoryLabelFromPath(validation.path),
    rootPath: validation.path,
    addedAt: new Date().toISOString(),
    lastScannedAt: null,
    inaccessible: false,
    lastError: null,
  };
  upsertDirectory(directory);

  let scanJobId: string | undefined;
  if (body.scan !== false) {
    const started = startScan(directory.id);
    if ("jobId" in started) scanJobId = started.jobId;
  }

  return NextResponse.json({ directory: toPublicDirectory(directory), scanJobId });
}

export async function DELETE(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const snapshot = readStudioIndex();
  const dir = snapshot.directories.find((d) => d.id === id);
  if (!dir) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteDirectory(id);
  return NextResponse.json({ ok: true });
}
