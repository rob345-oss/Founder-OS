import { afterEach, describe, expect, it, vi } from "vitest";

import { runCrmDataHandler } from "../server/crm-route";

describe("runCrmDataHandler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns JSON when persistence is not configured on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CRM_DATABASE_URL", "");
    const res = await runCrmDataHandler(async () => Response.json({ ok: true }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string; code?: string; detail?: string };
    expect(body.error).toBe("CRM data error");
    expect(body.code).toBe("crm_database_url_missing");
    expect(body.detail).toBeTruthy();
  });

  it("passes through successful handlers locally", async () => {
    const res = await runCrmDataHandler(async () => Response.json({ ok: true }));
    expect(res.status).toBe(200);
  });
});