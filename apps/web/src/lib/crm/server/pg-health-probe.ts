import { getCrmConfig } from "../config";
import { buildPgClientConnectionConfig, trustAnchorsIncludeSupabaseRoot2021 } from "./pg-connection";
import { withVerifiedPgClient } from "./pg-client";

const MIN_DEEP_PROBE_INTERVAL_MS = 120_000;

let lastDeepProbeAt = 0;
let lastDeepProbeResult: { ok: boolean; latencyMs: number; checkedAt: string } | null = null;

export type CrmHealthSnapshot = {
  driver: "sqlite" | "postgres";
  tlsRequired: boolean;
  rejectUnauthorized: boolean | null;
  trustAnchorsIncludeSupabaseRoot2021: boolean;
  databaseConfigured: boolean;
  deepProbe?: {
    ok: boolean;
    latencyMs: number;
    checkedAt: string;
    cached: boolean;
  };
};

function crmDriver(): "sqlite" | "postgres" {
  return getCrmConfig().databaseUrl ? "postgres" : "sqlite";
}

export function buildCrmHealthSnapshot(): CrmHealthSnapshot {
  const driver = crmDriver();
  const url = getCrmConfig().databaseUrl?.trim();
  const databaseConfigured = Boolean(url);

  if (driver === "sqlite" || !url) {
    return {
      driver,
      tlsRequired: false,
      rejectUnauthorized: null,
      trustAnchorsIncludeSupabaseRoot2021: false,
      databaseConfigured,
    };
  }

  const { ssl } = buildPgClientConnectionConfig(url);
  const tlsRequired = Boolean(ssl);
  const rejectUnauthorized =
    ssl && typeof ssl === "object" && !Array.isArray(ssl) ? Boolean(ssl.rejectUnauthorized) : null;
  const rawCa = ssl && typeof ssl === "object" && !Array.isArray(ssl) ? ssl.ca : undefined;
  const caForTrustCheck: string | string[] | undefined =
    rawCa === undefined
      ? undefined
      : Array.isArray(rawCa)
        ? rawCa.map((entry) => (typeof entry === "string" ? entry : entry.toString("utf8")))
        : typeof rawCa === "string"
          ? rawCa
          : rawCa.toString("utf8");

  return {
    driver,
    tlsRequired,
    rejectUnauthorized,
    trustAnchorsIncludeSupabaseRoot2021: trustAnchorsIncludeSupabaseRoot2021(caForTrustCheck),
    databaseConfigured,
  };
}

/** Rate-limited SELECT 1 — avoids exhausting the pool under frequent monitoring polls. */
export async function runCrmDatabaseDeepProbe(force = false): Promise<CrmHealthSnapshot["deepProbe"]> {
  const url = getCrmConfig().databaseUrl?.trim();
  if (!url || crmDriver() !== "postgres") {
    return { ok: true, latencyMs: 0, checkedAt: new Date().toISOString(), cached: true };
  }

  const now = Date.now();
  if (!force && lastDeepProbeResult && now - lastDeepProbeAt < MIN_DEEP_PROBE_INTERVAL_MS) {
    return { ...lastDeepProbeResult, cached: true };
  }

  const started = Date.now();
  try {
    await withVerifiedPgClient(url, async (q) => {
      await q("SELECT 1 AS ok");
    });
    const latencyMs = Date.now() - started;
    const checkedAt = new Date().toISOString();
    lastDeepProbeAt = now;
    lastDeepProbeResult = { ok: true, latencyMs, checkedAt };
    return { ok: true, latencyMs, checkedAt, cached: false };
  } catch {
    const latencyMs = Date.now() - started;
    const checkedAt = new Date().toISOString();
    lastDeepProbeAt = now;
    lastDeepProbeResult = { ok: false, latencyMs, checkedAt };
    return { ok: false, latencyMs, checkedAt, cached: false };
  }
}