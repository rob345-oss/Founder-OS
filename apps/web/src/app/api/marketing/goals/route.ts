import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { runMarketingDataHandler } from "@/lib/marketing/server/marketing-route";
import { createGoal, listGoals } from "@/lib/marketing/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return runMarketingDataHandler(async () => Response.json({ items: await listGoals() }));
}

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.title || typeof body.title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.metricKey || typeof body.metricKey !== "string") {
    return Response.json({ error: "metricKey is required" }, { status: 400 });
  }
  const targetValue = Number(body.targetValue);
  if (!Number.isFinite(targetValue)) {
    return Response.json({ error: "targetValue must be a number" }, { status: 400 });
  }
  const title = body.title as string;
  const metricKey = body.metricKey as string;
  return runMarketingDataHandler(async () => {
    const created = await createGoal({
      title,
      metricKey,
      targetValue,
      deadline: typeof body.deadline === "string" ? body.deadline : null,
      status: typeof body.status === "string" ? (body.status as "planned") : undefined,
    });
    return Response.json(created, { status: 201 });
  });
}