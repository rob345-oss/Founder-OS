import type { ConnectionOptions } from "node:tls";

const TLS_BYPASS_ENV_KEYS = [
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "CRM_DATABASE_SSL_REJECT_UNAUTHORIZED",
  "CRM_PGSSL_REJECT_UNAUTHORIZED",
] as const;

function envTruthy(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "no";
}

function envIsZero(name: string): boolean {
  return process.env[name]?.trim() === "0";
}

/** Reject process-wide or CRM-specific TLS verification bypasses before opening Postgres. */
export function assertCrmPgRuntimeAllowed(): void {
  if (envIsZero("NODE_TLS_REJECT_UNAUTHORIZED")) {
    throw new Error("NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden for CRM/Marketing database access.");
  }

  for (const key of TLS_BYPASS_ENV_KEYS) {
    if (key === "NODE_TLS_REJECT_UNAUTHORIZED") continue;
    if (envTruthy(key) || envIsZero(key)) {
      throw new Error(`${key} must not disable TLS certificate verification for CRM database connections.`);
    }
  }

  const globalOff = process.env.NODE_TLS_REJECT_UNAUTHORIZED?.trim();
  if (globalOff && globalOff !== "1") {
    throw new Error("NODE_TLS_REJECT_UNAUTHORIZED must be unset or '1' when CRM Postgres is used.");
  }
}

export function assertPgSslOptionsAllowed(ssl: boolean | ConnectionOptions | undefined): void {
  if (ssl === undefined || ssl === false) return;

  if (ssl === true) {
    throw new Error("pg SSL must use verified ConnectionOptions (rejectUnauthorized: true with CA bundle), not ssl: true.");
  }

  if ("rejectUnauthorized" in ssl && ssl.rejectUnauthorized === false) {
    throw new Error("rejectUnauthorized: false is forbidden for CRM/Marketing PostgreSQL connections.");
  }

  if ("checkServerIdentity" in ssl && ssl.checkServerIdentity) {
    const check = ssl.checkServerIdentity;
    if (typeof check !== "function") {
      throw new Error("Invalid checkServerIdentity override on CRM PostgreSQL SSL options.");
    }
  }
}