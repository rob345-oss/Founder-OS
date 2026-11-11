import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { assertStudioLocalRequest } from "@/lib/studio/server/guard";
import { addMediaToCollection, createCollection, listCollections } from "@/lib/studio/server/repository";

export async function GET(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  return NextResponse.json({ collections: listCollections() });
}

export async function POST(req: NextRequest) {
  const denied = assertStudioLocalRequest(req);
  if (denied) return denied;
  const body = (await req.json()) as { name?: string; mediaIds?: string[] };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  try {
    const collection = createCollection(body.name);
    if (body.mediaIds?.length) {
      addMediaToCollection(collection.id, body.mediaIds);
    }
    return NextResponse.json({ collection });
  } catch {
    return NextResponse.json({ error: "Collection already exists or invalid name." }, { status: 409 });
  }
}
