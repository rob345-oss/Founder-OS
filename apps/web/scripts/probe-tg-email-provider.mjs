#!/usr/bin/env node
/**
 * Documents authoritative staging email provider bindings (no secrets).
 * Reads senior-cybersecurity-346 infra/staging/cloud-run-deploy-bindings.json when available.
 */
import fs from "node:fs";
import path from "node:path";

const candidates = [
  process.env.INFRASTRUCTURE_TG_REPO_PATH,
  path.join(process.env.USERPROFILE ?? "", ".cursor", "projects", "senior-cybersecurity-346"),
].filter(Boolean);

let bindingsPath;
for (const root of candidates) {
  const p = path.join(root, "infra", "staging", "cloud-run-deploy-bindings.json");
  if (fs.existsSync(p)) {
    bindingsPath = p;
    break;
  }
}

if (!bindingsPath) {
  console.error("TG repo bindings file not found. Set INFRASTRUCTURE_TG_REPO_PATH.");
  process.exit(1);
}

const bindings = JSON.parse(fs.readFileSync(bindingsPath, "utf8"));
const env = bindings.update_env_vars ?? {};
console.log(
  JSON.stringify(
    {
      source: bindingsPath,
      environment: env.ENVIRONMENT ?? "unknown",
      email_provider: env.EMAIL_PROVIDER ?? "unset",
      email_from: env.EMAIL_FROM_ADDRESS ?? env.SENDGRID_FROM_EMAIL ?? null,
      sendgrid_from_fallback: env.SENDGRID_FROM_EMAIL ?? null,
      notes: [
        "TG backend resolves EMAIL_PROVIDER (twilio_email | sendgrid | smtp) in backend/email/config.py",
        "Waitlist confirmations call send_transactional_email() — provider-neutral",
        "SendGrid API key may remain configured as fallback secret even when EMAIL_PROVIDER=twilio_email",
      ],
    },
    null,
    2,
  ),
);
