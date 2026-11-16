import { resolveTgAppOrigin } from "./app-origin";

const ALLOWED_RETURN_PREFIXES = ["/marketing", "/crm", "/dashboard", "/admin"];

/**
 * Restrict post-login paths to same-app relative routes (open-redirect safe).
 */
export function sanitizeTgReturnPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.includes("://") || decoded.startsWith("//")) {
      return "/dashboard";
    }
  } catch {
    return "/dashboard";
  }

  const allowed = ALLOWED_RETURN_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : "/dashboard";
}

export function buildTgLoginUrl(returnPath: string, clientHostname?: string): string {
  const origin = resolveTgAppOrigin(clientHostname);
  const next = sanitizeTgReturnPath(returnPath);
  const url = new URL("/login", origin);
  url.searchParams.set("next", next);
  return url.toString();
}

export function navigateToTgLogin(returnPath: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(buildTgLoginUrl(returnPath, window.location.hostname));
}