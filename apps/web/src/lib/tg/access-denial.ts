export type SuperAdminAccessPhase = "loading" | "authorized" | "unauthenticated" | "forbidden" | "transient";

export function classifySuperAdminAccess(opts: {
  loading: boolean;
  hasBearer: boolean;
  authorized: boolean;
  error: string | null;
}): SuperAdminAccessPhase {
  if (opts.loading) return "loading";
  if (opts.authorized) return "authorized";
  if (!opts.hasBearer) return "unauthenticated";
  const err = opts.error?.toLowerCase() ?? "";
  if (err.includes("sign in")) return "unauthenticated";
  if (err.includes("super_admin")) return "forbidden";
  if (opts.error) return "transient";
  return "unauthenticated";
}