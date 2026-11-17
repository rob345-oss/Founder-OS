/**
 * Staging/CI Postgres connectivity probe (TLS + auth + SELECT 1). Never logs credentials.
 *
 *   npx tsx scripts/crm-pg-integration-probe.ts
 */
import { createVerifiedPgClient } from "../src/lib/crm/server/pg-client";

const url = process.env.CRM_DATABASE_URL?.trim();
if (!url) {
  console.error("[crm-pg-probe] CRM_DATABASE_URL missing — skip or configure secret for integration job.");
  process.exit(2);
}

function redactHost(raw: string): string {
  try {
    const u = new URL(raw.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:"));
    return u.hostname;
  } catch {
    return "unknown-host";
  }
}

async function main() {
  const started = Date.now();
  let client;
  try {
    client = await createVerifiedPgClient(url, { connectionTimeoutMillis: 15_000 });
    const host = redactHost(url);
    await client.query("SET search_path TO founder_os, public");
    const result = await client.query("SELECT 1::int AS ok");
    const latencyMs = Date.now() - started;
    console.log(
      JSON.stringify({
        ok: true,
        host,
        row: result.rows?.[0]?.ok ?? null,
        latencyMs,
        tlsVerified: true,
      }),
    );
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ ok: false, latencyMs, error: message }));
    process.exit(1);
  } finally {
    await client?.end().catch(() => undefined);
  }
}

void main();