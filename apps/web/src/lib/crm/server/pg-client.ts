import { buildPgClientConnectionConfig, toPgUrl } from "./pg-connection";

export type PgQueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

/** Shared verified-TLS pg client used by CRM and Marketing repositories. */
export async function withVerifiedPgClient<T>(rawUrl: string, fn: (query: PgQueryFn) => Promise<T>): Promise<T> {
  if (!rawUrl?.trim()) throw new Error("CRM_DATABASE_URL not configured");
  const { Client } = await import("pg");
  const { connectionString, ssl } = buildPgClientConnectionConfig(toPgUrl(rawUrl));
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 8_000,
    ssl,
  });
  try {
    await client.connect();
    await client.query("SET search_path TO founder_os, public");
    const query: PgQueryFn = async (sql, params) => {
      const result = await client.query(sql, params);
      return result.rows as unknown[];
    };
    return await fn(query);
  } finally {
    await client.end().catch(() => undefined);
  }
}