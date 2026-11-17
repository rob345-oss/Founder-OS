/**
 * Fail CI when raw `pg.Client` / `pg.Pool` are used outside the approved factory module.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const APPROVED_RELATIVE = new Set([
  path.normalize("src/lib/crm/server/pg-client.ts"),
]);

const SCAN_ROOTS = [path.join(webRoot, "src"), path.join(webRoot, "scripts")];

const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "__tests__"]);

const VIOLATION_PATTERNS = [
  { re: /\bnew\s+Client\s*\(/, label: "new Client(" },
  { re: /\bnew\s+Pool\s*\(/, label: "new Pool(" },
  { re: /from\s+["']pg["']/, label: 'import from "pg"' },
  { re: /import\s+pg\s+from\s+["']pg["']/, label: 'default import pg from "pg"' },
];

const SKIP_RELATIVE = new Set([
  path.normalize("scripts/audit-pg-client-usage.mjs"),
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function relativeToWeb(file) {
  return path.normalize(path.relative(webRoot, file));
}

let failed = false;

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const rel = relativeToWeb(file);
    if (APPROVED_RELATIVE.has(rel)) continue;
    if (SKIP_RELATIVE.has(rel)) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

    const text = fs.readFileSync(file, "utf8");
    for (const { re, label } of VIOLATION_PATTERNS) {
      if (!re.test(text)) continue;
      console.error(`[audit-pg-client] ${rel}: forbidden ${label} — use src/lib/crm/server/pg-client.ts`);
      failed = true;
      break;
    }
  }
}

if (failed) process.exit(1);
console.log("[audit-pg-client] OK — no rogue pg clients outside approved factory.");