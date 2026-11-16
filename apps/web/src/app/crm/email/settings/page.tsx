"use client";

export default function EmailSettingsPage() {
  return (
    <div className="space-y-4 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 text-sm text-[var(--studio-text-secondary)]">
      <p>
        Staging safety is enforced server-side. Set <code className="text-[var(--studio-text-primary)]">CRM_EMAIL_ALLOW_SEND=true</code> and{" "}
        <code className="text-[var(--studio-text-primary)]">CRM_EMAIL_STAGING_ALLOWLIST</code> on Founder OS, plus matching{" "}
        <code className="text-[var(--studio-text-primary)]">STAGING_EMAIL_ALLOWLIST</code> on Titanium Guardian API.
      </p>
      <p>
        Service auth: <code className="text-[var(--studio-text-primary)]">CRM_TG_CRM_EMAIL_SERVICE_SECRET</code> (Founder OS) must match{" "}
        <code className="text-[var(--studio-text-primary)]">CRM_CRM_EMAIL_SERVICE_SECRET</code> on TG Cloud Run.
      </p>
      <p>Open/click tracking requires provider webhooks and <code className="text-[var(--studio-text-primary)]">CRM_EMAIL_TRACK_ENGAGEMENT=true</code>.</p>
    </div>
  );
}