import { afterEach, describe, expect, it, vi } from "vitest";

import { assertCrmPersistenceForHost, resolveCrmDatabaseUrl } from "@/lib/crm/config";
import { assertMarketingPersistenceForHost, resolveMarketingDatabaseUrl } from "@/lib/marketing/config";

describe("resolveCrmDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not fall back to DATABASE_URL on Vercel staging", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("DATABASE_URL", "postgresql://example");
    vi.stubEnv("CRM_DATABASE_URL", "");
    expect(resolveCrmDatabaseUrl()).toBeUndefined();
  });

  it("prefers explicit CRM_DATABASE_URL", () => {
    vi.stubEnv("CRM_DATABASE_URL", "postgresql://crm");
    vi.stubEnv("DATABASE_URL", "postgresql://other");
    expect(resolveCrmDatabaseUrl()).toBe("postgresql://crm");
  });
});

describe("resolveMarketingDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not fall back to DATABASE_URL on hosted deploy", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "postgresql://generic");
    expect(resolveMarketingDatabaseUrl()).toBeUndefined();
  });
});

describe("assertCrmPersistenceForHost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws on hosted deploy without CRM_DATABASE_URL", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CRM_DATABASE_URL", "");
    expect(() => assertCrmPersistenceForHost()).toThrow(/CRM_DATABASE_URL is required/);
  });
});

describe("assertMarketingPersistenceForHost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws on hosted deploy without marketing/crm database url", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CRM_DATABASE_URL", "");
    vi.stubEnv("MARKETING_DATABASE_URL", "");
    expect(() => assertMarketingPersistenceForHost()).toThrow(/MARKETING_DATABASE_URL or CRM_DATABASE_URL/);
  });
});