import { afterEach, describe, expect, it, vi } from "vitest";

import { createVerifiedPgClient } from "../server/pg-client";

describe("createVerifiedPgClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-postgres schemes", async () => {
    await expect(createVerifiedPgClient("mysql://localhost/db")).rejects.toThrow(/postgres/i);
  });

  it("rejects empty connection strings", async () => {
    await expect(createVerifiedPgClient("   ")).rejects.toThrow(/empty/i);
  });

  it("rejects when NODE_TLS_REJECT_UNAUTHORIZED=0", async () => {
    vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
    await expect(
      createVerifiedPgClient("postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"),
    ).rejects.toThrow(/NODE_TLS_REJECT_UNAUTHORIZED/);
  });
});