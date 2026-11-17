import { afterEach, describe, expect, it, vi } from "vitest";

import { assertCrmPgRuntimeAllowed, assertPgSslOptionsAllowed } from "../server/pg-runtime-guards";

describe("assertCrmPgRuntimeAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects NODE_TLS_REJECT_UNAUTHORIZED=0", () => {
    vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
    expect(() => assertCrmPgRuntimeAllowed()).toThrow(/forbidden/i);
  });

  it("rejects CRM-specific TLS bypass flags", () => {
    vi.stubEnv("CRM_DATABASE_SSL_REJECT_UNAUTHORIZED", "false");
    expect(() => assertCrmPgRuntimeAllowed()).toThrow(/must not disable/i);
  });
});

describe("assertPgSslOptionsAllowed", () => {
  it("rejects rejectUnauthorized: false", () => {
    expect(() => assertPgSslOptionsAllowed({ rejectUnauthorized: false })).toThrow(/rejectUnauthorized: false/);
  });

  it("rejects ssl: true without CA bundle", () => {
    expect(() => assertPgSslOptionsAllowed(true)).toThrow(/not ssl: true/);
  });

  it("allows verified TLS options", () => {
    expect(() => assertPgSslOptionsAllowed({ rejectUnauthorized: true, ca: ["pem"] })).not.toThrow();
  });
});