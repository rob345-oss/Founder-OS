// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error pg package.json exports omit this subpath typings
import ConnectionParameters from "pg/lib/connection-parameters.js";
import tls from "node:tls";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPgClientConnectionConfig,
  loadTrustAnchors,
  resolvePgSslOptions,
  stripLibpqSslParams,
  trustAnchorsIncludeSupabaseRoot2021,
} from "../server/pg-connection";

describe("stripLibpqSslParams", () => {
  it("removes ssl-related query keys while preserving other params", () => {
    const raw =
      "postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&application_name=founder-os";
    const { connectionString, sslmode } = stripLibpqSslParams(raw);
    expect(sslmode).toBe("require");
    expect(connectionString).toBe(
      "postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?application_name=founder-os",
    );
    expect(connectionString).not.toMatch(/sslmode|sslrootcert/);
  });
});

describe("resolvePgSslOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables verified TLS for Supabase session pooler hosts", () => {
    const connectionString =
      "postgresql://postgres.ref:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
    const ssl = resolvePgSslOptions({ connectionString, sslmodeFromUrl: "require" });
    expect(ssl).toMatchObject({ rejectUnauthorized: true });
    expect(ssl).toHaveProperty("ca");
  });

  it("rejects sslmode=no-verify in the database URL", () => {
    expect(() =>
      resolvePgSslOptions({
        connectionString: "postgresql://user:pass@localhost:5432/app?sslmode=no-verify",
        sslmodeFromUrl: "no-verify",
      }),
    ).toThrow(/not permitted/);
  });

  it("honors explicit TLS disable via env (local tooling only)", () => {
    vi.stubEnv("CRM_DATABASE_SSL", "false");
    const ssl = resolvePgSslOptions({
      connectionString: "postgresql://user:pass@aws.pooler.supabase.com:5432/postgres",
      sslmodeFromUrl: "require",
    });
    expect(ssl).toBeUndefined();
  });
});

describe("loadTrustAnchors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("always includes embedded Supabase Root 2021 CA (no disk dependency)", () => {
    const ca = loadTrustAnchors();
    expect(trustAnchorsIncludeSupabaseRoot2021(ca)).toBe(true);
    expect(ca.length).toBeGreaterThan(tls.rootCertificates.length);
  });
});

describe("buildPgClientConnectionConfig", () => {
  it("keeps programmatic SSL after pg parses the connection string", () => {
    const raw =
      "postgresql://postgres.ref:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
    const built = buildPgClientConnectionConfig(raw);
    expect(built.connectionString).not.toContain("sslmode");

    const params = new ConnectionParameters({
      connectionString: built.connectionString,
      connectionTimeoutMillis: 8_000,
      ssl: built.ssl,
    });

    expect(params.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(params.ssl).toHaveProperty("ca");
    expect(trustAnchorsIncludeSupabaseRoot2021((params.ssl as { ca?: string | string[] }).ca)).toBe(true);
  });
});