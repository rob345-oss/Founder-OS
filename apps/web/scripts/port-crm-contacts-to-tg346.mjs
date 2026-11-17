#!/usr/bin/env node
/**
 * Copy canonical Founder-OS CRM contact management files into senior-cybersecurity-346 frontend.
 * TG uses `frontend/app/*` (not `src/`) per tsconfig path aliases.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const founderRoot = path.resolve(webRoot, "../..");

const tgRoot = process.env.TG346_ROOT ?? path.resolve(founderRoot, "../senior-cybersecurity-346");
const tgFrontend = path.join(tgRoot, "frontend");

if (!fs.existsSync(tgFrontend)) {
  console.error(`TG frontend not found at ${tgFrontend}. Set TG346_ROOT if needed.`);
  process.exit(1);
}

/** Founder-OS paths under apps/web (src/...) → TG paths under frontend/app/... */
const relPaths = [
  "src/lib/crm/contact-profile.ts",
  "src/lib/crm/contact-phone.ts",
  "src/lib/crm/contact-countries.ts",
  "src/lib/crm/social-profiles.ts",
  "src/lib/crm/types.ts",
  "src/lib/crm/client-api.ts",
  "src/lib/crm/server/contact-payload.ts",
  "src/lib/crm/server/repository.ts",
  "src/lib/crm/server/mappers.ts",
  "src/lib/crm/server/db.ts",
  "src/lib/crm/server/crm-contact-enhancements-sqlite.ts",
  "src/components/crm/crmUi.ts",
  "src/components/crm/contacts/ContactAvatar.tsx",
  "src/components/crm/contacts/ContactEditorModal.tsx",
  "src/components/crm/contacts/ContactPhoneFields.tsx",
  "src/components/crm/contacts/CountryCallingCodeSelect.tsx",
  "src/components/crm/contacts/ContactNotesPanel.tsx",
  "src/components/crm/contacts/ContactInfoOverview.tsx",
  "src/components/crm/contacts/ContactProfileHeader.tsx",
  "src/components/crm/contacts/contactQuickActions.ts",
  "src/app/crm/contacts/page.tsx",
  "src/app/crm/contacts/[id]/page.tsx",
  "src/app/api/crm/contacts/route.ts",
  "src/app/api/crm/contacts/[id]/route.ts",
  "src/app/api/crm/contacts/duplicates/route.ts",
  "src/app/api/crm/contacts/[id]/notes/route.ts",
  "src/app/api/crm/contacts/[id]/notes/[noteId]/route.ts",
];

function tgDest(rel) {
  if (rel.startsWith("src/app/")) return `app/${rel.slice("src/app/".length)}`;
  if (rel.startsWith("src/lib/") || rel.startsWith("src/components/")) {
    return rel.replace(/^src\//, "app/");
  }
  return rel;
}

let copied = 0;
for (const rel of relPaths) {
  const from = path.join(webRoot, rel);
  const to = path.join(tgFrontend, tgDest(rel));
  if (!fs.existsSync(from)) {
    console.warn(`skip missing ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied += 1;
}

const migFrom = path.join(founderRoot, "supabase/migrations/000012_crm_contact_enhancements.sql");
const migTo = path.join(tgRoot, "supabase/migrations/000012_crm_contact_enhancements.sql");
if (fs.existsSync(migFrom)) {
  fs.mkdirSync(path.dirname(migTo), { recursive: true });
  fs.copyFileSync(migFrom, migTo);
}

console.log(`Ported ${copied} CRM contact files to ${tgFrontend} (app/ tree)`);