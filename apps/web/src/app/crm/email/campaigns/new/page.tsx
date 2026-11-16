"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { crmBtnPrimary, crmBtnSecondary } from "@/components/crm/crmUi";
import { useCrmSession } from "@/components/crm/useCrmSession";
import {
  fetchEmailLabels,
  fetchEmailTemplates,
  previewCampaignAudienceApi,
  saveEmailCampaignApi,
  scheduleCampaignApi,
  sendCampaignTestEmail,
} from "@/lib/crm/email-client-api";
import type { AudienceFilter, CrmEmailLabel, CrmEmailTemplate } from "@/lib/crm/email/types";

const STEPS = ["Details", "Template", "Audience", "Review", "Send"];

export default function NewEmailCampaignPage() {
  const { token } = useCrmSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [labels, setLabels] = useState<CrmEmailLabel[]>([]);
  const [templates, setTemplates] = useState<CrmEmailTemplate[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceFilter["mode"]>("waitlist");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [testAddress, setTestAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void Promise.all([fetchEmailLabels(token), fetchEmailTemplates(token)]).then(([l, t]) => {
      setLabels(l);
      setTemplates(t);
    });
  }, [token]);

  const audienceFilter: AudienceFilter = {
    mode: audienceMode,
    requireMarketingConsent: true,
  };

  async function persistDraft(): Promise<string> {
    if (!token) throw new Error("Not signed in");
    const tpl = templates.find((t) => t.id === templateId);
    const campaign = await saveEmailCampaignApi(token, {
      id: campaignId ?? undefined,
      name: name || "Untitled campaign",
      description,
      subject: subject || tpl?.subjectDefault || "",
      previewText: previewText || tpl?.previewTextDefault || "",
      fromName: tpl?.fromName ?? "Titanium Guardian",
      fromAddress: tpl?.fromAddress,
      templateId: templateId || null,
      templateVersionId: tpl?.currentVersionId ?? null,
      audienceFilter,
      excludedContactIds: [],
      labelIds,
      communicationType: "promotional",
      status: "draft",
      scheduledTimezone: "UTC",
      internalNotes: "",
    } as never);
    setCampaignId(campaign.id);
    return campaign.id;
  }

  async function refreshAudience(id: string) {
    if (!token) return;
    const preview = await previewCampaignAudienceApi(token, id, { audienceFilter });
    setAudienceCount(preview.totalEligible);
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, idx) => (
          <li
            key={label}
            className={[
              "rounded-full border px-3 py-1",
              idx === step ? "border-[var(--studio-accent)] text-[var(--studio-accent)]" : "border-[var(--studio-border)] text-[var(--studio-text-tertiary)]",
            ].join(" ")}
          >
            {idx + 1}. {label}
          </li>
        ))}
      </ol>

      {error && <p className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      {step === 0 && (
        <section className="space-y-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className="w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2" />
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const active = labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => setLabelIds((prev) => (active ? prev.filter((x) => x !== label.id) : [...prev, label.id]))}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: active ? label.color : "var(--studio-border)", color: active ? label.color : undefined }}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm">
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject override" className="w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm" />
          <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Preview text" className="w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm" />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <p className="text-sm text-[var(--studio-text-secondary)]">Promotional sends require marketing consent and exclude suppressions.</p>
          {(
            [
              ["all_eligible", "All eligible contacts"],
              ["waitlist", "Waitlist leads"],
              ["manual", "Manual selection (save draft, then refine)"],
            ] as const
          ).map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input type="radio" name="audience" checked={audienceMode === mode} onChange={() => setAudienceMode(mode)} />
              {label}
            </label>
          ))}
          {audienceCount != null && (
            <p className="text-sm font-medium text-[var(--studio-text-primary)]">{audienceCount} eligible recipients</p>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 text-sm">
          <p>
            <strong>Name:</strong> {name}
          </p>
          <p>
            <strong>Template:</strong> {templates.find((t) => t.id === templateId)?.name ?? "—"}
          </p>
          <p>
            <strong>Subject:</strong> {subject || templates.find((t) => t.id === templateId)?.subjectDefault}
          </p>
          <p>
            <strong>Audience:</strong> {audienceMode} ({audienceCount ?? "—"} recipients)
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={testAddress}
              onChange={(e) => setTestAddress(e.target.value)}
              placeholder="Test inbox (staging allowlist)"
              className="flex-1 rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2"
            />
            <button
              type="button"
              className="rounded-md border border-[var(--studio-border)] px-3 py-2 text-xs"
              onClick={() => {
                void (async () => {
                  if (!token) return;
                  const id = campaignId ?? (await persistDraft());
                  await sendCampaignTestEmail(token, id, testAddress);
                })().catch((e) => setError(e instanceof Error ? e.message : "Test failed"));
              }}
            >
              Send test
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <label className="block text-sm">
            Schedule (local) — leave empty to send immediately on confirmation
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2"
            />
          </label>
          <p className="text-xs text-[var(--studio-text-tertiary)]">Staging sends are limited to CRM_EMAIL_STAGING_ALLOWLIST recipients.</p>
        </section>
      )}

      <div className="flex justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className={crmBtnSecondary}>
          Back
        </button>
        <button
          type="button"
          className={crmBtnPrimary}
          onClick={() => {
            void (async () => {
              setError(null);
              try {
                const id = campaignId ?? (await persistDraft());
                if (step === 2) await refreshAudience(id);
                if (step === STEPS.length - 1) {
                  if (scheduledAt) {
                    await scheduleCampaignApi(token!, id, new Date(scheduledAt).toISOString());
                  } else {
                    const { sendCampaignNowApi } = await import("@/lib/crm/email-client-api");
                    await sendCampaignNowApi(token!, id);
                  }
                  router.push(`/crm/email/campaigns/${id}`);
                  return;
                }
                setStep((s) => s + 1);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Step failed");
              }
            })();
          }}
        >
          {step === STEPS.length - 1 ? "Confirm send" : "Continue"}
        </button>
      </div>
    </div>
  );
}