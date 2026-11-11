import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function timingSafeStringEqual(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Studio local media APIs must never run on hosted deployments (e.g. Vercel)
 * where they would touch the host's disk — not the user's PC.
 */
export function assertStudioLocalRequest(req: NextRequest): Response | null {
  if (process.env.VERCEL === "1") {
    return new Response("Studio local filesystem is disabled on Vercel deployments.", { status: 403 });
  }

  const localFsEnabled = process.env.STUDIO_ENABLE_LOCAL_FS === "true";
  if (process.env.NODE_ENV === "production" && !localFsEnabled) {
    return new Response(
      "Studio local filesystem is off in production. Set STUDIO_ENABLE_LOCAL_FS=true on your local Next.js server only.",
      { status: 403 },
    );
  }

  const serverToken = process.env.STUDIO_LOCAL_TOKEN?.trim();
  if (serverToken) {
    const header = req.headers.get("x-studio-local-token") ?? "";
    if (!timingSafeStringEqual(serverToken, header)) {
      return new Response("Unauthorized", { status: 401 });
    }
    return assertStudioSameSite(req);
  }

  const hostname = req.nextUrl.hostname;
  if (!LOOPBACK_HOSTS.has(hostname)) {
    return new Response("Studio local APIs are available on loopback only unless STUDIO_LOCAL_TOKEN is configured.", {
      status: 403,
    });
  }

  return assertStudioSameSite(req);
}

/**
 * Reduce cross-site drive-by access to loopback media (e.g. malicious pages embedding stream URLs).
 * Same-origin browser traffic always sends Origin or Referer matching the app host.
 */
export function assertStudioSameSite(req: NextRequest): Response | null {
  const host = req.nextUrl.host;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      if (!hostsMatch(url.host, host)) {
        return new Response("Forbidden", { status: 403 });
      }
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
    return null;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (!hostsMatch(url.host, host)) {
        return new Response("Forbidden", { status: 403 });
      }
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return null;
}
