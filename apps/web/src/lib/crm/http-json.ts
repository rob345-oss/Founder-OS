/** Shared JSON helpers for CRM/Marketing API routes and browser client. */

export type ApiJsonErrorBody = {
  error: string;
  detail?: string;
  code?: string;
};

const SENSITIVE_PATTERNS: RegExp[] = [
  /postgres(?:ql)?:\/\/[^\s'"]+/gi,
  /\bpassword[=:\s][^\s'"]+/gi,
  /\bBearer\s+[A-Za-z0-9._-]+/gi,
  /\b(?:token|secret|apikey|api_key)[=:\s][^\s'"]+/gi,
];

export function sanitizeClientErrorDetail(message: string): string {
  let out = message.replace(/\s+/g, " ").trim();
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  if (out.includes(" at ") && /\.tsx?:\d+/.test(out)) {
    return "An internal error occurred.";
  }
  return out.slice(0, 280);
}

export function classifyDataError(err: unknown, scope: "crm" | "marketing" = "crm"): {
  message: string;
  code: string;
  status: number;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = sanitizeClientErrorDetail(raw);

  if (
    raw.includes("CRM_DATABASE_URL is required") ||
    raw.includes("CRM_DATABASE_URL not configured") ||
    (raw.includes("MARKETING_DATABASE_URL") && raw.includes("required")) ||
    raw.includes("MARKETING_DATABASE_URL / CRM_DATABASE_URL not configured")
  ) {
    return {
      message:
        scope === "marketing"
          ? "Marketing database is not configured for this deployment."
          : "CRM database is not configured for this deployment.",
      code: scope === "marketing" ? "marketing_database_url_missing" : "crm_database_url_missing",
      status: 503,
    };
  }

  if (msg.includes("sslmode=no-verify is not permitted")) {
    return { message: msg, code: "database_tls_insecure_rejected", status: 503 };
  }

  if (msg.includes("relation") && msg.includes("does not exist")) {
    return {
      message:
        scope === "marketing"
          ? "Marketing database schema is not applied on staging Postgres."
          : "CRM database schema is not applied. Run supabase/migrations/000003_crm.sql on staging Postgres.",
      code: scope === "marketing" ? "marketing_schema_missing" : "crm_schema_missing",
      status: 503,
    };
  }

  const connectivity =
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|self[- ]signed certificate|certificate verify failed|SSL|TLS|timeout expired/i.test(
      raw,
    );
  if (connectivity) {
    return {
      message: "Database connection failed. Verify CRM_DATABASE_URL and network access.",
      code: "database_connectivity",
      status: 503,
    };
  }

  return {
    message: msg || "Data layer unavailable",
    code: "data_internal_error",
    status: 503,
  };
}

/** @deprecated Prefer classifyDataError; kept for existing tests. */
export function crmPersistenceErrorMessage(err: unknown): { message: string; code?: string; status: number } {
  const mapped = classifyDataError(err, "crm");
  return { message: mapped.message, code: mapped.code, status: mapped.status };
}

export function jsonErrorResponse(body: ApiJsonErrorBody, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function readJsonBody<T extends Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(res.status === 401 ? "Unauthorized" : res.status === 403 ? "Forbidden" : `HTTP ${res.status} (empty response)`);
    }
    throw new Error("Unexpected empty response from server");
  }
  let parsed: T & { error?: string; detail?: string };
  try {
    parsed = JSON.parse(text) as T & { error?: string; detail?: string };
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const parts = [parsed.error, parsed.detail].filter(Boolean);
    throw new Error(parts.length > 0 ? parts.join(": ") : `HTTP ${res.status}`);
  }
  return parsed;
}