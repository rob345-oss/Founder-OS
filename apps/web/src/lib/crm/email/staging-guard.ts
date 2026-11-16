import { getCrmConfig } from "../config";
import { normalizeEmail } from "../normalize";

export function assertStagingRecipientAllowed(toEmail: string): { ok: true } | { ok: false; reason: string } {
  const cfg = getCrmConfig();
  if (cfg.tgApiEnvIsProduction) return { ok: true };

  if (cfg.emailAllowSend !== true) {
    return { ok: false, reason: "Staging sends are disabled (set CRM_EMAIL_ALLOW_SEND=true)." };
  }

  const allowlist = cfg.emailStagingAllowlist;
  if (!allowlist.length) {
    return {
      ok: false,
      reason: "Staging allowlist empty. Set CRM_EMAIL_STAGING_ALLOWLIST with approved test inboxes.",
    };
  }

  const norm = normalizeEmail(toEmail);
  if (!allowlist.includes(norm)) {
    return {
      ok: false,
      reason: `Recipient ${norm} is not in CRM_EMAIL_STAGING_ALLOWLIST.`,
    };
  }

  return { ok: true };
}