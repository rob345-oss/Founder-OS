import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { createContentItem, listContentItems } from "@/lib/marketing/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return Response.json({ items: await listContentItems() });
}

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.title || typeof body.title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  const created = await createContentItem({
    title: body.title,
    platform: typeof body.platform === "string" ? body.platform : null,
    contentType: typeof body.contentType === "string" ? body.contentType : null,
    status: typeof body.status === "string" ? (body.status as "idea") : undefined,
    publishDate: typeof body.publishDate === "string" ? body.publishDate : null,
    hook: typeof body.hook === "string" ? body.hook : null,
    cta: typeof body.cta === "string" ? body.cta : null,
    notes: typeof body.notes === "string" ? body.notes : null,
  });
  return Response.json(created, { status: 201 });
}
