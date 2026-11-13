import type { MarketingSessionInfo } from "./client-api";

const CLIENT_SESSION_TIMEOUT_MS = 12_000;

let inflight: Promise<MarketingSessionInfo> | null = null;
let inflightKey = "";

function sessionErrorMessage(status: number, body: { error?: string; detail?: string }): string {
  if (status === 401) return "Sign in with your Titanium Guardian Google account.";
  if (status === 403) return "Your account is signed in but does not have the super_admin role.";
  if (status >= 500) return "Authorization service is temporarily unavailable. Try again shortly.";
  return body.error ?? body.detail ?? `Session check failed (HTTP ${status})`;
}

async function fetchMarketingSessionOnce(token: string): Promise<MarketingSessionInfo> {
  const res = await fetch("/api/marketing/session", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(CLIENT_SESSION_TIMEOUT_MS),
  });

  let body: MarketingSessionInfo & { error?: string; detail?: string } = { authorized: false };
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

export function fetchMarketingSessionDeduped(token: string): Promise<MarketingSessionInfo> {
  const key = token.slice(0, 12);
  if (inflight && inflightKey === key) return inflight;
  inflightKey = key;
  inflight = fetchMarketingSessionOnce(token).finally(() => {
    inflight = null;
    inflightKey = "";
  });
  return inflight;
}
