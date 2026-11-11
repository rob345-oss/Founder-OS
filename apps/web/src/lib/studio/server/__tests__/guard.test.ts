import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { assertStudioLocalRequest, assertStudioSameSite } from "../guard";

describe("studio guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks Vercel deployments", () => {
    vi.stubEnv("VERCEL", "1");
    const req = new NextRequest("http://localhost:3000/api/studio/media");
    const denied = assertStudioLocalRequest(req);
    expect(denied?.status).toBe(403);
  });

  it("allows loopback without token in development", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");
    const req = new NextRequest("http://localhost:3000/api/studio/media", {
      headers: { origin: "http://localhost:3000" },
    });
    const denied = assertStudioLocalRequest(req);
    expect(denied).toBeNull();
  });

  it("rejects mismatched origin", () => {
    const req = new NextRequest("http://localhost:3000/api/studio/media", {
      headers: { origin: "http://evil.test" },
    });
    expect(assertStudioSameSite(req)?.status).toBe(403);
  });
});
