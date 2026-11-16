import { getCrmConfig } from "../config";

export type TgEmailSendResult = {
  accepted: boolean;
  providerMessageId?: string;
  error?: string;
  httpStatus?: number;
};

export async function sendTransactionalEmailViaTg(input: {
  bearer: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  idempotencyKey: string;
  fromName?: string;
  fromAddress?: string;
}): Promise<TgEmailSendResult> {
  const cfg = getCrmConfig();
  const serviceSecret = cfg.tgCrmEmailServiceSecret;
  if (!serviceSecret) {
    return { accepted: false, error: "CRM_TG_CRM_EMAIL_SERVICE_SECRET is not configured" };
  }

  const url = `${cfg.tgApiBaseUrl.replace(/\/$/, "")}/v1/internal/crm/email/send`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.bearer}`,
        "X-CRM-Email-Service-Key": serviceSecret,
        "X-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        to_email: input.toEmail,
        subject: input.subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml,
        idempotency_key: input.idempotencyKey,
        from_name: input.fromName,
        from_address: input.fromAddress,
      }),
      signal: AbortSignal.timeout(cfg.backendTimeoutMs),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      accepted?: boolean;
      operation_id?: string;
      provider_message_id?: string;
      error?: string;
      detail?: string;
    };
    if (!res.ok) {
      return { accepted: false, error: body.detail ?? body.error ?? `HTTP ${res.status}`, httpStatus: res.status };
    }
    return {
      accepted: body.accepted === true,
      providerMessageId: body.provider_message_id ?? body.operation_id,
      error: body.error,
      httpStatus: res.status,
    };
  } catch (e) {
    return { accepted: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}