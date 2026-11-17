#!/usr/bin/env tsx
/**
 * Report which founder_os marketing tables exist (no DDL).
 * Requires CRM_DATABASE_URL.
 */
import { createVerifiedPgClient } from "../src/lib/crm/server/pg-client";

const tables = [
  "marketing_campaigns",
  "marketing_goals",
  "marketing_content_items",
  "marketing_settings",
  "marketing_social_accounts",
  "marketing_social_posts",
  "marketing_social_post_metrics",
  "marketing_social_media_assets",
];

const url = process.env.CRM_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("CRM_DATABASE_URL required");
  process.exit(1);
}

async function main() {
  const client = await createVerifiedPgClient(url, { connectionTimeoutMillis: 20_000 });
  try {
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'founder_os' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [tables],
    );
    const found = new Set(rows.map((r: { table_name: string }) => r.table_name));
    const missing = tables.filter((t) => !found.has(t));
    console.log(JSON.stringify({ found: [...found], missing, complete: missing.length === 0 }, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});