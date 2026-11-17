/**
 * Compare CRM Postgres contract files between Founder-OS (apps/web) and Titanium Guardian (frontend).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");
const tgRoot = process.env.TG_FRONTEND_ROOT?.trim()
  ? path.resolve(process.env.TG_FRONTEND_ROOT)
  : path.resolve(repoRoot, "../senior-cybersecurity-346/frontend");

const CONTRACT_FILES = [
  "src/lib/crm/server/pg-connection.ts",
  "src/lib/crm/server/supabase-root-ca-2021.ts",
  "src/lib/crm/server/pg-runtime-guards.ts",
  "src/lib/crm/server/pg-client.ts",
];

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function tgPath(relativeFromWeb) {
  return path.join(tgRoot, "app", relativeFromWeb.replace(/^src\//, ""));
}

let failed = false;

for (const rel of CONTRACT_FILES) {
  const fos = path.join(webRoot, rel);
  const tg = tgPath(rel);
  if (!fs.existsSync(fos)) {
    console.error(`[crm-pg-parity] missing Founder-OS file ${rel}`);
    failed = true;
    continue;
  }
  if (!fs.existsSync(tg)) {
    console.error(`[crm-pg-parity] missing TG file ${path.relative(tgRoot, tg)}`);
    failed = true;
    continue;
  }
  const a = sha(fos);
  const b = sha(tg);
  if (a !== b) {
    console.error(`[crm-pg-parity] drift ${rel}: Founder-OS ${a.slice(0, 12)}… vs TG ${b.slice(0, 12)}…`);
    failed = true;
  } else {
    console.log(`[crm-pg-parity] OK ${rel}`);
  }
}

if (failed) process.exit(1);