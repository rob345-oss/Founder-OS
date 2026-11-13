import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) {
    const status = guard.response.status;
    if (status === 403) return Response.json({ authorized: false, error: "forbidden" }, { status: 403 });
    if (status === 401) return Response.json({ authorized: false, error: "unauthorized" }, { status: 401 });
    const body = (await guard.response.json().catch(() => ({}))) as { error?: string; detail?: string };
    return Response.json(
      { authorized: false, error: body.error ?? "unavailable", detail: body.detail },
      { status: status >= 400 ? status : 503 },
    );
  }
  return Response.json({
    authorized: true,
    email: guard.principal.email,
    role: guard.principal.tgApplicationRole ?? "super_admin",
  });
}
