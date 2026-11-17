import { X509Certificate } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// createRequire: pg subpath lacks TS exports under package "exports"
const ConnectionParameters = require("pg/lib/connection-parameters.js") as new (config: {
  connectionString: string;
  connectionTimeoutMillis?: number;
  ssl?: unknown;
}) => { ssl: unknown };
import tls from "node:tls";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPABASE_ROOT_CA_2021_FINGERPRINT256,
  SUPABASE_ROOT_CA_2021_PEM,
} from "../server/supabase-root-ca-2021";

import {
  buildPgClientConnectionConfig,
  loadTrustAnchors,
  resolvePgSslOptions,
  stripLibpqSslParams,
  trustAnchorsIncludeSupabaseRoot2021,
} from "../server/pg-connection";

describe("Supabase Root CA bundle", () => {
  it("matches the official Supabase prod-ca-2021 fingerprint", () => {
    const cert = new X509Certificate(SUPABASE_ROOT_CA_2021_PEM);
    expect(cert.fingerprint256).toBe(SUPABASE_ROOT_CA_2021_FINGERPRINT256);
    expect(cert.subject).toContain("Supabase Root 2021 CA");
  });
});

describe("stripLibpqSslParams", () => {
  it("removes ssl-related query keys while preserving other params", () => {
    const raw =
      "postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&application_name=tg-crm";
    const { connectionString, sslmode } = stripLibpqSslParams(raw);
    expect(sslmode).toBe("require");
    expect(connectionString).toBe(
      "postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?application_name=tg-crm",
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

  it("honors explicit TLS disable", () => {
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
  it("rejects sslmode=no-verify via resolve path", () => {
    expect(() =>
      buildPgClientConnectionConfig("postgresql://user:pass@localhost/postgres?sslmode=no-verify"),
    ).toThrow(/not permitted/);
  });

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
    expect(
      trustAnchorsIncludeSupabaseRoot2021(
        (params.ssl as { ca?: string | string[] }).ca,
      ),
    ).toBe(true);
  });
});