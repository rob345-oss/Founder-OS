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

  it("allows loopback without token in development", async () => {
    const prevVercel = process.env.VERCEL;
    const prevNode = process.env.NODE_ENV;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "development";
    try {
      const req = new NextRequest("http://localhost:3000/api/studio/media", {
        headers: { origin: "http://localhost:3000" },
      });
      const denied = assertStudioLocalRequest(req);
      expect(denied).toBeNull();
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      if (prevNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNode;
    }
  });

  it("rejects mismatched origin", () => {
    const req = new NextRequest("http://localhost:3000/api/studio/media", {
      headers: { origin: "http://evil.test" },
    });
    expect(assertStudioSameSite(req)?.status).toBe(403);
  });
});
