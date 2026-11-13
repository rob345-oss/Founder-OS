import type { NextRequest } from "next/server";

import { handleEmailWebhookRequest } from "@/lib/crm/server/email-ingest";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const result = await handleEmailWebhookRequest({
    rawBody,
    contentType: req.headers.get("content-type"),
    signatureHeader: req.headers.get("x-crm-webhook-signature"),
    sendgridSignature:
      req.headers.get("x-twilio-email-event-webhook-signature") ?? req.headers.get("x-sendgrid-signature"),
    sendgridTimestamp:
      req.headers.get("x-twilio-email-event-webhook-timestamp") ?? req.headers.get("x-sendgrid-timestamp"),
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ingested: result.ingested, skipped: result.skipped });
}
