/**
 * CRM Postgres TLS connectivity check (uses CRM_DATABASE_URL from environment).
 * Run from apps/web:
 *   npx tsx scripts/test-crm-pg-connect.ts
 */
import pg from "pg";

import { buildPgClientConnectionConfig } from "../src/lib/crm/server/pg-connection";

const url = process.env.CRM_DATABASE_URL?.trim();
if (!url) {
  console.error("CRM_DATABASE_URL missing");
  process.exit(1);
}

const { connectionString, ssl } = buildPgClientConnectionConfig(url);
const ca = ssl && typeof ssl === "object" && !Array.isArray(ssl) ? ssl.ca : undefined;
const caCount = Array.isArray(ca) ? ca.length : ca ? 1 : 0;
const includesSupabaseCa =
  Array.isArray(ca) && ca.some((pem) => typeof pem === "string" && pem.includes("Supabase Root 2021 CA"));

console.log(
  JSON.stringify({
    host: connectionString.replace(/:[^:@/]+@/, ":****@").replace(/\?.*$/, ""),
    sslEnabled: Boolean(ssl),
    rejectUnauthorized: ssl && typeof ssl === "object" ? ssl.rejectUnauthorized : null,
    trustAnchorCount: caCount,
    includesSupabaseRoot2021: includesSupabaseCa,
  }),
);

async function main() {
  const client = new pg.Client({ connectionString, ssl, connectionTimeoutMillis: 12_000 });
  try {
    await client.connect();
    await client.query("SET search_path TO founder_os, public");
    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS contacts FROM crm_contacts WHERE archived_at IS NULL",
    );
    console.log(JSON.stringify({ ok: true, contacts: rows[0]?.contacts ?? null }));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();