import type { Client } from "pg";

import { buildPgClientConnectionConfig } from "./pg-connection";
import { assertCrmPgRuntimeAllowed, assertPgSslOptionsAllowed } from "./pg-runtime-guards";

export type PgQueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Approved factory for verified-TLS `pg.Client` instances used by CRM and Marketing.
 * Do not construct `pg.Client` elsewhere — CI enforces this via `audit-pg-client-usage.mjs`.
 */
export async function createVerifiedPgClient(
  rawUrl: string,
  options?: { connectionTimeoutMillis?: number },
): Promise<Client> {
  assertCrmPgRuntimeAllowed();
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Database URL is empty.");
  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    throw new Error("Database URL must use postgres:// or postgresql:// scheme.");
  }

  const { connectionString, ssl } = buildPgClientConnectionConfig(trimmed);
  assertPgSslOptionsAllowed(ssl);

  const { Client } = await import("pg");
  const client = new Client({
    connectionString,
    ssl,
    connectionTimeoutMillis: options?.connectionTimeoutMillis ?? DEFAULT_TIMEOUT_MS,
  });
  await client.connect();
  return client;
}

export async function withVerifiedPgClient<T>(
  rawUrl: string,
  fn: (query: PgQueryFn) => Promise<T>,
  options?: { connectionTimeoutMillis?: number; searchPath?: string },
): Promise<T> {
  const client = await createVerifiedPgClient(rawUrl, options);
  const searchPath = options?.searchPath ?? "founder_os, public";
  try {
    await client.query(`SET search_path TO ${searchPath}`);
    const query: PgQueryFn = async (sql, params) => {
      const result = await client.query(sql, params);
      return result.rows as unknown[];
    };
    return await fn(query);
  } finally {
    await client.end().catch(() => undefined);
  }
}