/**
 * Ensure Contact Profile v2 shell is present in source (and optionally in build output).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "src/components/crm/contacts/ContactProfileHeader.tsx",
  "src/components/crm/contacts/ContactInfoOverview.tsx",
  "src/app/crm/contacts/[id]/page.tsx",
];

let failed = false;

for (const rel of required) {
  const full = path.join(webRoot, rel);
  if (!fs.existsSync(full)) {
    console.error(`[crm-profile-v2] missing ${rel}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  if (rel.endsWith("page.tsx") && !text.includes("ContactProfileHeader")) {
    console.error(`[crm-profile-v2] ${rel} does not import ContactProfileHeader`);
    failed = true;
  }
}

const buildPage = path.join(webRoot, ".next", "server", "app", "crm", "contacts", "[id]", "page.js");
if (process.env.CRM_PROFILE_V2_REQUIRE_BUILD === "1") {
  if (!fs.existsSync(buildPage)) {
    console.error("[crm-profile-v2] build output missing contact profile page");
    failed = true;
  } else {
    const bundle = fs.readFileSync(buildPage, "utf8");
    if (!bundle.includes("ContactProfileHeader")) {
      console.error("[crm-profile-v2] build output missing ContactProfileHeader");
      failed = true;
    } else {
      console.log("[crm-profile-v2] build artifact includes ContactProfileHeader");
    }
  }
} else if (fs.existsSync(buildPage)) {
  console.log("[crm-profile-v2] skip strict build artifact check (set CRM_PROFILE_V2_REQUIRE_BUILD=1 in CI after build)");
}

if (failed) process.exit(1);
console.log("[crm-profile-v2] OK");