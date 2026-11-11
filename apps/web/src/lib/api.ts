const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch(
  path: string,
  token: string | null,
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");
  return fetch(`${base}${path}`, { ...init, headers });
}

export type DashboardSummary = {
  venture_count: number;
  project_count: number;
  task_open_count: number;
  task_done_count: number;
};

export async function getSummary(token: string): Promise<DashboardSummary> {
  const r = await apiFetch("/api/v1/dashboard/summary", token);
  if (!r.ok) {
    throw new Error(await r.text());
  }
  return r.json() as Promise<DashboardSummary>;
}
