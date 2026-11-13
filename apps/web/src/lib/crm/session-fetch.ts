import type { CrmSessionInfo } from "./client-api";

const CLIENT_SESSION_TIMEOUT_MS = 12_000;

let inflight: Promise<CrmSessionInfo> | null = null;
let inflightKey = "";

export function sessionErrorMessage(status: number, body: { error?: string; detail?: string }): string {
  if (status === 401) return "Sign in with your Titanium Guardian Google account.";
  if (status === 403) return "Your account is signed in but does not have the super_admin role.";
  if (status >= 500) return "Authorization service is temporarily unavailable. Try again shortly.";
  return body.error ?? body.detail ?? `Session check failed (HTTP ${status})`;
}

async function fetchCrmSessionOnce(token: string): Promise<CrmSessionInfo> {
  const res = await fetch("/api/crm/session", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(CLIENT_SESSION_TIMEOUT_MS),
  });

  let body: CrmSessionInfo & { error?: string; detail?: string } = { authorized: false };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = { authorized: false, error: "invalid_response" };
  }

  if (!res.ok) {
    throw new Error(sessionErrorMessage(res.status, body));
  }

  return {
    authorized: Boolean(body.authorized),
    email: body.email,
    role: body.role,
  };
}

/** Dedupes parallel CRM session probes (gate + pages) into one in-flight request per token. */
export function fetchCrmSessionDeduped(token: string): Promise<CrmSessionInfo> {
  const key = token.slice(0, 12);
  if (inflight && inflightKey === key) {
    return inflight;
  }
  inflightKey = key;
  inflight = fetchCrmSessionOnce(token).finally(() => {
    inflight = null;
    inflightKey = "";
  });
  return inflight;
}

export function logCrmSessionDiag(ms: number, outcome: "authorized" | "denied" | "error"): void {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_CRM_SESSION_DIAG !== "true") return;
  console.info(`[crm-session] ${outcome} in ${Math.round(ms)}ms`);
}
