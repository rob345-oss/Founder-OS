import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TgLeadRecord } from "../types";
import { closeCrmSqlite, resetCrmSqliteForTests } from "../server/db";
import { upsertContactFromLeadSqlite } from "../server/repository";

describe("waitlist sync idempotency", () => {
  let dbPath: string;

  beforeEach(() => {
    vi.stubEnv("CRM_DATABASE_URL", "");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-test-"));
    dbPath = path.join(dir, "crm.db");
    resetCrmSqliteForTests(dbPath);
  });

  afterEach(() => {
    closeCrmSqlite();
    vi.unstubAllEnvs();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  const lead: TgLeadRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "Jane@Example.com",
    name: "Jane Smith",
    topic: "waitlist",
    status: "new",
    beta_testing_interest: true,
    country_code: "US",
    created_at: "2026-11-01T10:00:00.000Z",
  };

  it("does not duplicate contacts or joined_waitlist events on repeat import", () => {
    const db = resetCrmSqliteForTests(dbPath);
    const first = upsertContactFromLeadSqlite(db, lead);
    const second = upsertContactFromLeadSqlite(db, lead);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.contact.id).toBe(second.contact.id);

    const contacts = db.prepare("SELECT COUNT(*) AS c FROM crm_contacts").get() as { c: number };
    expect(contacts.c).toBe(1);

    const events = db
      .prepare("SELECT COUNT(*) AS c FROM crm_activities WHERE event_type = 'joined_waitlist'")
      .get() as { c: number };
    expect(events.c).toBe(1);
  });
});
