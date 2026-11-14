import fs from "node:fs";
import tls from "node:tls";

import type { ConnectionOptions } from "node:tls";

import { SUPABASE_ROOT_CA_2021_PEM } from "./supabase-root-ca-2021";

const LIBPQ_SSL_QUERY_KEYS = [
  "sslmode",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "uselibpqcompat",
  "sslnegotiation",
] as const;

const SUPABASE_CA_FINGERPRINT = "MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYw";

export function toPgUrl(raw: string): string {
  return raw.replace(/^postgresql\+asyncpg:/, "postgresql:").replace(/^postgres\+asyncpg:/, "postgres:");
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function postgresHostname(connectionString: string): string | undefined {
  const match = connectionString.match(/^postgres(?:ql)?:\/\/(?:[^@]+@)?([^/:?]+)/i);
  return match?.[1]?.toLowerCase();
}

function hostRequiresTls(hostname: string | undefined): boolean {
  if (!hostname) return false;
  return hostname.includes("supabase.com") || hostname.includes("supabase.co");
}

export function stripLibpqSslParams(connectionString: string): {
  connectionString: string;
  sslmode: string | null;
} {
  const sslmodeMatch = connectionString.match(/(?:^|[?&])sslmode=([^&]+)/i);
  const sslmode = sslmodeMatch ? decodeURIComponent(sslmodeMatch[1]) : null;

  let stripped = connectionString;
  for (const key of LIBPQ_SSL_QUERY_KEYS) {
    stripped = stripped.replace(new RegExp(`([?&])${key}=[^&]*`, "gi"), (_match, sep: string) => {
      return sep === "?" ? "?" : sep;
    });
  }
  stripped = stripped.replace(/\?&/g, "?").replace(/\?$/, "");
  stripped = stripped.replace(/[?]&/, "?");

  return { connectionString: stripped, sslmode };
}

export function trustAnchorsIncludeSupabaseRoot2021(ca: string | string[] | undefined): boolean {
  if (!ca) return false;
  const list = Array.isArray(ca) ? ca : [ca];
  return list.some(
    (pem) => pem.includes(SUPABASE_CA_FINGERPRINT) || pem.trim() === SUPABASE_ROOT_CA_2021_PEM.trim(),
  );
}

/** Build trust store for verified TLS (Mozilla roots + embedded Supabase Root 2021 CA). */
export function loadTrustAnchors(): string[] {
  const inline = readEnv("CRM_DATABASE_SSL_CA_PEM");
  if (inline) return [inline, ...tls.rootCertificates, SUPABASE_ROOT_CA_2021_PEM];

  const configuredPath =
    readEnv("CRM_DATABASE_SSL_CA_PATH") ??
    readEnv("CRM_DATABASE_SSL_CA_FILE") ??
    readEnv("CRM_DATABASE_SSL_ROOT_CERT");
  if (configuredPath && fs.existsSync(configuredPath)) {
    const filePem = fs.readFileSync(configuredPath, "utf8");
    return [filePem, ...tls.rootCertificates, SUPABASE_ROOT_CA_2021_PEM];
  }

  return [...tls.rootCertificates, SUPABASE_ROOT_CA_2021_PEM];
}

export function resolvePgSslOptions(params: {
  connectionString: string;
  sslmodeFromUrl: string | null;
}): boolean | ConnectionOptions | undefined {
  if (readEnv("CRM_DATABASE_SSL") === "false") return undefined;

  const sslmode = (params.sslmodeFromUrl ?? readEnv("CRM_DATABASE_SSL_MODE") ?? "").toLowerCase();
  if (sslmode === "disable") return false;

  const host = postgresHostname(params.connectionString);
  const tlsRequired =
    sslmode === "require" ||
    sslmode === "prefer" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full" ||
    sslmode === "no-verify" ||
    hostRequiresTls(host);

  if (!tlsRequired) return undefined;

  if (sslmode === "no-verify") {
    throw new Error("CRM database URL sslmode=no-verify is not permitted; use verified TLS with a CA bundle.");
  }

  return {
    rejectUnauthorized: true,
    ca: loadTrustAnchors(),
  };
}

export function buildPgClientConnectionConfig(rawUrl: string): {
  connectionString: string;
  ssl: boolean | ConnectionOptions | undefined;
} {
  const normalized = toPgUrl(rawUrl);
  const { connectionString, sslmode } = stripLibpqSslParams(normalized);
  return {
    connectionString,
    ssl: resolvePgSslOptions({ connectionString: normalized, sslmodeFromUrl: sslmode }),
  };
}