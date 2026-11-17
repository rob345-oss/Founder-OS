#!/usr/bin/env node
/**
 * Verify 000012_crm_contact_enhancements columns exist (staging DB probe).
 * Requires CRM_DATABASE_URL or DATABASE_URL — never prints connection strings.
 */
import pg from "pg";

const url = process.env.CRM_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set CRM_DATABASE_URL or DATABASE_URL");
  process.exit(1);
}

const connectionString = url
  .replace(/^postgresql\+asyncpg:/, "postgresql:")
  .replace(/^postgres\+asyncpg:/, "postgres:");

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 20_000 });

const expectedNoteCols = ["category", "pinned"];

async function main() {
  await client.connect();

  const noteCols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'founder_os' AND table_name = 'crm_notes'
       AND column_name = ANY($1::text[])
     ORDER BY column_name`,
    [expectedNoteCols],
  );

  const customFields = await client.query(
    `SELECT to_regclass('founder_os.crm_custom_field_definitions') AS regclass`,
  );

  const missingNotes = expectedNoteCols.filter((c) => !noteCols.rows.some((r) => r.column_name === c));
  const hasCustomFieldsTable = Boolean(customFields.rows[0]?.regclass);

  console.log(
    JSON.stringify(
      {
        ok: missingNotes.length === 0 && hasCustomFieldsTable,
        crm_notes: noteCols.rows.map((r) => r.column_name),
        crm_custom_field_definitions: hasCustomFieldsTable,
        missing: { crm_notes: missingNotes },
      },
      null,
      2,
    ),
  );

  await client.end();
  if (missingNotes.length || !hasCustomFieldsTable) process.exit(2);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});