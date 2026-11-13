import crypto from "node:crypto";

import { getCrmConfig } from "../config";
import { normalizeEmail } from "../normalize";
import { ingestEmailProviderEvents } from "./email-repository";

export type EmailWebhookParseResult =
  | { ok: true; ingested: number; skipped: number }
  | { ok: false; status: number; error: string };

const SENDGRID_STATUS_MAP: Record<string, string> = {
  processed: "queued",
  deferred: "queued",
  delivered: "delivered",
  bounce: "bounced",
  dropped: "failed",
  blocked: "failed",
};

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifySharedSecretSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getCrmConfig().emailWebhookSecret;
  if (!secret || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(expected, signatureHeader.trim());
}

/** SendGrid / Twilio Email Event Webhook (ECDSA). */
export function verifySendGridEventSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  const publicKey = getCrmConfig().sendgridWebhookPublicKey;
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const payload = timestamp + rawBody;
    const verifier = crypto.createVerify("SHA256");
    verifier.update(payload, "utf8");
    verifier.end();
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

type SendGridEvent = {
  email?: string;
  event?: string;
  timestamp?: number;
  sg_event_id?: string;
  sg_message_id?: string;
  subject?: string;
  reason?: string;
};

type TwilioEmailForwardedEvent = {
  operation_id?: string;
  message_id?: string;
  to?: string;
  from?: string;
  subject?: string;
  status?: string;
  event?: string;
  timestamp?: string;
};

function mapSendGridDeliveryStatus(event: string): string | null {
  return SENDGRID_STATUS_MAP[event] ?? (event === "open" || event === "click" ? event : null);
}

export async function handleEmailWebhookRequest(opts: {
  rawBody: string;
  contentType: string | null;
  signatureHeader: string | null;
  sendgridSignature: string | null;
  sendgridTimestamp: string | null;
}): Promise<EmailWebhookParseResult> {
  const cfg = getCrmConfig();
  const sharedOk = verifySharedSecretSignature(opts.rawBody, opts.signatureHeader);
  const sendgridOk = verifySendGridEventSignature(opts.rawBody, opts.sendgridSignature, opts.sendgridTimestamp);
  if (!sharedOk && !sendgridOk) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(opts.rawBody) as unknown;
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }

  const events: Array<{
    provider: string;
    providerMessageId: string;
    toAddress: string;
    fromAddress?: string;
    subject?: string;
    deliveryStatus: string;
    sentAt?: string;
    templateKey?: string;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  }> = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed as SendGridEvent[]) {
      const eventName = (item.event ?? "").toLowerCase();
      if (!cfg.emailTrackEngagement && (eventName === "open" || eventName === "click")) continue;
      const status = mapSendGridDeliveryStatus(eventName);
      if (!status) continue;
      const email = item.email?.trim();
      if (!email || !item.sg_message_id) continue;
      const idem = item.sg_event_id ?? `${item.sg_message_id}:${eventName}:${item.timestamp ?? ""}`;
      events.push({
        provider: sendgridOk ? "twilio_sendgrid_events" : "crm_hmac",
        providerMessageId: item.sg_message_id,
        toAddress: email,
        deliveryStatus: eventName === "open" || eventName === "click" ? eventName : status,
        sentAt: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : undefined,
        idempotencyKey: idem,
        metadata: { event: eventName, reason: item.reason ?? null },
      });
    }
  } else if (parsed && typeof parsed === "object") {
    const row = parsed as TwilioEmailForwardedEvent;
    const email = row.to?.trim();
    const opId = row.operation_id ?? row.message_id;
    if (email && opId) {
      const statusRaw = (row.status ?? row.event ?? "sent").toLowerCase();
      let deliveryStatus = "sent";
      if (statusRaw.includes("deliver")) deliveryStatus = "delivered";
      else if (statusRaw.includes("bounce") || statusRaw.includes("fail")) deliveryStatus = "failed";
      else if (statusRaw.includes("defer")) deliveryStatus = "queued";
      events.push({
        provider: "twilio_email",
        providerMessageId: opId,
        toAddress: email,
        fromAddress: row.from,
        subject: row.subject,
        deliveryStatus,
        sentAt: row.timestamp,
        idempotencyKey: `${opId}:${deliveryStatus}:${row.timestamp ?? ""}`,
        metadata: { status: statusRaw },
      });
    }
  }

  if (!events.length) {
    return { ok: true, ingested: 0, skipped: 0 };
  }

  const result = await ingestEmailProviderEvents(events);
  return { ok: true, ingested: result.ingested, skipped: result.skipped };
}

export function contactIdHintFromEmail(email: string): string | null {
  return normalizeEmail(email);
}
