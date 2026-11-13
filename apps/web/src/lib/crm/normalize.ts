export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseEmailList(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.split(/[,;]/);
  const out = new Set<string>();
  for (const item of items) {
    const n = normalizeEmail(item);
    if (n.includes("@")) out.add(n);
  }
  return [...out];
}
