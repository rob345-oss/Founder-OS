#!/usr/bin/env tsx
/**
 * Apply Founder OS CRM SQL migrations to staging Postgres (founder_os schema).
 * Requires CRM_DATABASE_URL or DATABASE_URL with DDL permission.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createVerifiedPgClient } from "../src/lib/crm/server/pg-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const migrations = [
  "000003_crm.sql",
  "000004_crm_security.sql",
  "000006_marketing_command_center.sql",
  "000007_marketing_security.sql",
  "000008_crm_email_campaigns.sql",
  "000009_crm_email_security.sql",
  "000010_social_command_center.sql",
  "000011_social_command_center_security.sql",
  "000012_crm_contact_enhancements.sql",
];

const url = process.env.CRM_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Set CRM_DATABASE_URL or DATABASE_URL before running.");
  process.exit(1);
}

async function main() {
  const client = await createVerifiedPgClient(url, { connectionTimeoutMillis: 15_000 });
  try {
    for (const file of migrations) {
      const sqlPath = path.join(repoRoot, "supabase", "migrations", file);
      if (!fs.existsSync(sqlPath)) {
        console.error(`Missing migration: ${sqlPath}`);
        process.exit(1);
      }
      const sql = fs.readFileSync(sqlPath, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log("CRM + Marketing migrations complete.");
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});