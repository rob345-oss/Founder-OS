import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleEmailWebhookRequest, verifySharedSecretSignature } from "../server/email-ingest";
import { closeCrmSqlite, resetCrmSqliteForTests } from "../server/db";
import { createContact } from "../server/repository";

describe("CRM email webhook", () => {
  let dbPath: string;

  beforeEach(() => {
    vi.stubEnv("CRM_DATABASE_URL", "");
    vi.stubEnv("CRM_EMAIL_WEBHOOK_SECRET", "test-webhook-secret");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-email-test-"));
    dbPath = path.join(dir, "crm.db");
    resetCrmSqliteForTests(dbPath);
  });

  afterEach(() => {
    closeCrmSqlite();
    vi.unstubAllEnvs();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("rejects unsigned payloads", async () => {
    const res = await handleEmailWebhookRequest({
      rawBody: "[]",
      contentType: "application/json",
      signatureHeader: "bad",
      sendgridSignature: null,
      sendgridTimestamp: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("ingests signed SendGrid-style events for known contacts", async () => {
    await createContact({ primaryEmail: "waitlist@example.com", fullName: "Waitlist" }, "test-user");
    const body = JSON.stringify([
      {
        email: "waitlist@example.com",
        event: "delivered",
        timestamp: 1_700_000_000,
        sg_message_id: "msg-abc",
        sg_event_id: "evt-1",
      },
    ]);
    const sig = crypto.createHmac("sha256", "test-webhook-secret").update(body, "utf8").digest("hex");
    const res = await handleEmailWebhookRequest({
      rawBody: body,
      contentType: "application/json",
      signatureHeader: sig,
      sendgridSignature: null,
      sendgridTimestamp: null,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ingested).toBe(1);
  });

  it("verifySharedSecretSignature uses constant-time compare", () => {
    const body = '{"test":true}';
    const sig = crypto.createHmac("sha256", "test-webhook-secret").update(body, "utf8").digest("hex");
    expect(verifySharedSecretSignature(body, sig)).toBe(true);
    expect(verifySharedSecretSignature(body, "00")).toBe(false);
  });
});
