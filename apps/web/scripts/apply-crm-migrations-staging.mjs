#!/usr/bin/env node
/**
 * Apply Founder OS CRM SQL migrations to staging Postgres (founder_os schema).
 * Requires CRM_DATABASE_URL or DATABASE_URL with DDL permission.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const migrations = [
  "000003_crm.sql",
  "000004_crm_security.sql",
  "000006_marketing_command_center.sql",
  "000007_marketing_security.sql",
];

const url = process.env.CRM_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set CRM_DATABASE_URL or DATABASE_URL before running.");
  process.exit(1);
}

const connectionString = url.replace(/^postgresql\+asyncpg:/, "postgresql:").replace(/^postgres\+asyncpg:/, "postgres:");
const client = new pg.Client({ connectionString, connectionTimeoutMillis: 15_000 });

async function main() {
  await client.connect();
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
  await client.end();
  console.log("CRM + Marketing migrations complete.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
