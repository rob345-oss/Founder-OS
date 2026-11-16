/**
 * External platform publishing stays disabled unless explicitly armed server-side.
 * Scheduling records and drafts are always allowed.
 */
export function isMarketingPublishArmed(): boolean {
  const v = process.env.MARKETING_PUBLISH_ARMED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function assertPublishNotArmedForExternalDispatch(): { ok: true } | { ok: false; reason: string } {
  if (isMarketingPublishArmed()) {
    return { ok: false, reason: "External publish adapter is armed but not implemented in this phase." };
  }
  return { ok: true };
}