import type { NextRequest } from "next/server";

import { buildCrmHealthSnapshot, runCrmDatabaseDeepProbe } from "@/lib/crm/server/pg-health-probe";

export const dynamic = "force-dynamic";

function healthTokenAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRM_HEALTH_TOKEN?.trim();
  if (!expected) return false;
  const provided =
    req.headers.get("x-crm-health-token")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(provided && provided === expected);
}

export async function GET(req: NextRequest) {
  if (!healthTokenAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const snapshot = buildCrmHealthSnapshot();
  const deep = req.nextUrl.searchParams.get("deep");
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (deep === "1" || deep === "true") {
    snapshot.deepProbe = await runCrmDatabaseDeepProbe(force);
  }

  const ok =
    snapshot.driver === "sqlite" ||
    (snapshot.databaseConfigured &&
      (!snapshot.tlsRequired || snapshot.rejectUnauthorized === true) &&
      (snapshot.deepProbe ? snapshot.deepProbe.ok : true));

  return Response.json(
    {
      ok,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      ...snapshot,
    },
    { status: ok ? 200 : 503 },
  );
}