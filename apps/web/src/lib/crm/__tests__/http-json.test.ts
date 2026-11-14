import { describe, expect, it } from "vitest";

import { classifyDataError, crmPersistenceErrorMessage, readJsonBody, sanitizeClientErrorDetail } from "../http-json";

describe("readJsonBody", () => {
  it("throws a readable error on empty 503 bodies", async () => {
    const res = new Response("", { status: 503, headers: { "Content-Type": "application/json" } });
    await expect(readJsonBody(res)).rejects.toThrow(/empty response/i);
  });

  it("parses success payloads", async () => {
    const res = new Response(JSON.stringify({ totalContacts: 3 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const data = await readJsonBody<{ totalContacts: number }>(res);
    expect(data.totalContacts).toBe(3);
  });

  it("surfaces API error and detail fields", async () => {
    const res = new Response(JSON.stringify({ error: "CRM data error", detail: "CRM database is not configured" }), {
      status: 503,
    });
    await expect(readJsonBody(res)).rejects.toThrow(/CRM data error/);
  });

  it("rejects invalid JSON", async () => {
    const res = new Response("not-json", { status: 200 });
    await expect(readJsonBody(res)).rejects.toThrow(/Invalid JSON/);
  });
});

describe("sanitizeClientErrorDetail", () => {
  it("redacts postgres connection strings", () => {
    const cleaned = sanitizeClientErrorDetail("failed: postgresql://user:secret@host/db");
    expect(cleaned).not.toContain("secret");
    expect(cleaned).toContain("[redacted]");
  });
});

describe("crmPersistenceErrorMessage", () => {
  it("maps missing CRM database configuration", () => {
    const mapped = crmPersistenceErrorMessage(new Error("CRM_DATABASE_URL is required on hosted CRM deployments"));
    expect(mapped.code).toBe("crm_database_url_missing");
    expect(mapped.status).toBe(503);
  });

  it("maps missing relations to schema hint", () => {
    const mapped = crmPersistenceErrorMessage(new Error('relation "crm_contacts" does not exist'));
    expect(mapped.code).toBe("crm_schema_missing");
  });
});

describe("classifyDataError", () => {
  it("rejects insecure ssl mode errors with dedicated code", () => {
    const mapped = classifyDataError(new Error("CRM database URL sslmode=no-verify is not permitted"));
    expect(mapped.code).toBe("database_tls_insecure_rejected");
  });

  it("maps connection failures without leaking secrets", () => {
    const mapped = classifyDataError(
      new Error("connect ECONNREFUSED postgresql://user:pw@aws.pooler.supabase.com:5432/db"),
    );
    expect(mapped.code).toBe("database_connectivity");
    expect(mapped.message).not.toContain("pw");
  });
});