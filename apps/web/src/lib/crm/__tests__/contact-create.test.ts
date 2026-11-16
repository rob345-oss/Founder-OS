import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findDuplicatesInList } from "../duplicate-match";
import { closeCrmSqlite, resetCrmSqliteForTests } from "../server/db";
import { createContact } from "../server/repository";

describe("createContact duplicate handling", () => {
  let dbPath: string;

  beforeEach(() => {
    vi.stubEnv("CRM_DATABASE_URL", "");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-create-test-"));
    dbPath = path.join(dir, "crm.db");
    resetCrmSqliteForTests(dbPath);
  });

  afterEach(() => {
    closeCrmSqlite();
    vi.unstubAllEnvs();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("returns duplicate matches for the same email", async () => {
    const first = await createContact({ primaryEmail: "dup@example.com", fullName: "First" }, "user-1");
    expect(first.ok).toBe(true);
    const second = await createContact({ primaryEmail: "dup@example.com", fullName: "Second" }, "user-1");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.duplicates[0]?.reason).toBe("exact_email");
    }
  });

  it("findDuplicatesInList matches phone candidates", () => {
    const matches = findDuplicatesInList(
      { phone: "+1 (555) 123-4567" },
      [{ id: "a", primaryEmail: "a@example.com", phone: "5551234567" }],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reason).toBe("possible_phone");
  });
});