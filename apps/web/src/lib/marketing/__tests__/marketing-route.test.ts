import { afterEach, describe, expect, it, vi } from "vitest";

import { runMarketingDataHandler } from "../server/marketing-route";

describe("runMarketingDataHandler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns JSON when persistence is not configured on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CRM_DATABASE_URL", "");
    const res = await runMarketingDataHandler(async () => Response.json({ ok: true }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.error).toBe("Marketing data error");
    expect(body.code).toBe("marketing_database_url_missing");
  });
});