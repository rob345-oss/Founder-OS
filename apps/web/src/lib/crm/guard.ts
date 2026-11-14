import type { NextRequest } from "next/server";

import { getCrmConfig } from "./config";
import { sanitizeClientErrorDetail } from "./http-json";
import { fetchTgAuthMe, isSuperAdminProfile } from "./tg-client";

export type CrmPrincipal = {
  userId: string;
  email: string | null;
  tgApplicationRole: string | null;
};

export type CrmGuardResult =
  | { ok: true; principal: CrmPrincipal; bearer: string }
  | { ok: false; response: Response };

function unauthorized(message: string): Response {
  return Response.json({ error: message }, { status: 401 });
}

function forbidden(message: string): Response {
  return Response.json({ error: message }, { status: 403 });
}

export async function requireCrmSuperAdmin(req: NextRequest): Promise<CrmGuardResult> {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match?.[1]) {
      return { ok: false, response: unauthorized("Missing bearer token. Sign in with a super_admin account.") };
    }

    getCrmConfig();

    const token = match[1].trim();
    const me = await fetchTgAuthMe(token);
    if (!me.ok) {
      if (me.status === 401) return { ok: false, response: unauthorized("Titanium Guardian session rejected.") };
      return {
        ok: false,
        response: Response.json(
          {
            error: "Unable to verify Titanium Guardian super_admin role.",
            detail: me.error ? sanitizeClientErrorDetail(me.error) : undefined,
            code: "auth_upstream_unavailable",
          },
          { status: 503 },
        ),
      };
    }

    if (!isSuperAdminProfile(me.data)) {
      return { ok: false, response: forbidden("CRM requires Titanium Guardian super_admin role.") };
    }

    return {
      ok: true,
      bearer: token,
      principal: {
        userId: me.data.id,
        email: me.data.email?.trim().toLowerCase() ?? null,
        tgApplicationRole: me.data.application_role ?? null,
      },
    };
  } catch (e) {
    const detail = sanitizeClientErrorDetail(e instanceof Error ? e.message : "CRM auth failed");
    return {
      ok: false,
      response: Response.json({ error: "CRM authorization error.", detail, code: "auth_internal_error" }, { status: 503 }),
    };
  }
}

export function guardResponse(result: CrmGuardResult): Response | null {
  if (result.ok) return null;
  return result.response;
}
