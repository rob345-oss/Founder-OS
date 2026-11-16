const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

const FALLBACKS: Record<string, string> = {
  first_name: "there",
  last_name: "",
  company_name: "your organization",
  full_name: "friend",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type PersonalizationFields = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  preferred_language?: string | null;
};

export function buildPersonalizationFromContact(input: {
  fullName: string;
  organization?: string | null;
  preferredLanguage?: string | null;
}): PersonalizationFields {
  const parts = input.fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return {
    first_name: first || null,
    last_name: last || null,
    full_name: input.fullName.trim() || null,
    company_name: input.organization?.trim() || null,
    preferred_language: input.preferredLanguage ?? null,
  };
}

export function applyPersonalization(
  template: string,
  fields: PersonalizationFields,
  opts?: { html?: boolean },
): string {
  return template.replace(TOKEN_RE, (_match, key: string) => {
    const normalized = key.toLowerCase();
    const raw = fields[normalized as keyof PersonalizationFields];
    const value = typeof raw === "string" && raw.trim() ? raw.trim() : (FALLBACKS[normalized] ?? "");
    return opts?.html ? escapeHtml(String(value)) : String(value);
  });
}