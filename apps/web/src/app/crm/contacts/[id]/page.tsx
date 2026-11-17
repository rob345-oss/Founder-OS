"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ContactEditorModal } from "@/components/crm/contacts/ContactEditorModal";
import { ContactInfoOverview } from "@/components/crm/contacts/ContactInfoOverview";
import { ContactProfileHeader } from "@/components/crm/contacts/ContactProfileHeader";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { ContactNotesPanel } from "@/components/crm/contacts/ContactNotesPanel";
import { fetchCrmContact } from "@/lib/crm/client-api";
import { fetchContactEmailActivity } from "@/lib/crm/email-client-api";
import type { CrmEmailActivityItem } from "@/lib/crm/email/types";
import { contactToProfile } from "@/lib/crm/contact-profile";
import type { CrmActivity, CrmContact, CrmEmailMessage, CrmFollowUp, CrmNote } from "@/lib/crm/types";

type TabKey = "overview" | "contact" | "social" | "notes" | "emails" | "timeline" | "followups" | "relationships" | "waitlist";

export default function CrmContactProfilePage() {
  const params = useParams<{ id: string }>();
  const { token } = useCrmSession();
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [emails, setEmails] = useState<CrmEmailMessage[]>([]);
  const [followUps, setFollowUps] = useState<CrmFollowUp[]>([]);
  const [campaignEmails, setCampaignEmails] = useState<CrmEmailActivityItem[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const data = await fetchCrmContact(token, params.id);
    setContact(data.contact);
    setNotes(data.notes);
    setActivities(data.activities);
    setEmails(data.emails);
    setFollowUps(data.followUps);
    setCampaignEmails(await fetchContactEmailActivity(token, params.id));
  }, [token, params.id]);

  useEffect(() => {
    void load();
  }, [load]);


  if (!contact) {
    return <div className="p-10 text-sm text-[var(--studio-text-secondary)]">Loading profile…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <ContactProfileHeader contact={contact} onEdit={() => setEditorOpen(true)} />

      <ContactEditorModal
        open={editorOpen}
        mode="edit"
        contact={contact}
        token={token}
        onClose={() => setEditorOpen(false)}
        onSaved={(c) => {
          setContact(c);
          void load();
        }}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["contact", "Contact information"],
            ["social", "Social profiles"],
            ["notes", "Notes"],
            ["emails", "Email activity"],
            ["relationships", "Relationships"],
            ["timeline", "Activity"],
            ["followups", "Follow-ups"],
            ["waitlist", "Waitlist"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === key
                ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]"
                : "border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 sm:p-6">
        {tab === "overview" && (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Field label="Organization" value={contact.organization ?? "—"} />
            <Field label="Pipeline" value={contact.pipelineStage.replaceAll("_", " ")} />
            <Field label="Classifications" value={contact.classifications.join(", ") || "—"} />
            <Field label="Next follow-up" value={contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toLocaleString() : "—"} />
            <Field label="Last contact" value={contact.lastInteractionAt ? new Date(contact.lastInteractionAt).toLocaleString() : "—"} />
            <Field label="Date added" value={new Date(contact.dateAdded).toLocaleDateString()} />
          </dl>
        )}

        {tab === "contact" && <ContactInfoOverview contact={contact} />}

        {tab === "social" && (() => {
          const profile = contactToProfile(contact);
          return (
            <ul className="space-y-2 text-sm">
              {profile.socialLinks.filter((s) => s.url.trim()).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--studio-border)] p-3">
                  <span className="font-medium capitalize">{s.platform.replaceAll("_", " ")}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[var(--studio-accent)] hover:underline">
                    {s.handle || s.url}
                  </a>
                  <span className="text-xs text-[var(--studio-text-tertiary)]">Open profile</span>
                </li>
              ))}
              {profile.socialLinks.every((s) => !s.url.trim()) && (
                <p className="text-[var(--studio-text-tertiary)]">No social profiles yet.</p>
              )}
            </ul>
          );
        })()}

        {tab === "notes" && (
          <ContactNotesPanel contactId={contact.id} token={token} notes={notes} onChange={load} />
        )}

        {tab === "relationships" && (() => {
          const profile = contactToProfile(contact);
          return (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Strength" value={profile.relationship.strength || "—"} />
              <Field label="Introduced by" value={profile.relationship.introducedBy || "—"} />
              <Field label="Priority" value={profile.relationship.priority || "—"} />
              <Field label="Owner" value={profile.relationship.relationshipOwner || "—"} />
              <Field label="Campaign" value={profile.relationship.associatedCampaign || "—"} />
              <Field label="How we met" value={profile.identity.howWeMet || "—"} />
              <Field label="Referral source" value={profile.identity.referralSource || profile.crm.leadSource || "—"} />
            </dl>
          );
        })()}

        {tab === "emails" && (
          <ul className="space-y-2 text-sm">
            {campaignEmails.map((m) => (
              <li key={m.id} className="rounded-xl border border-[var(--studio-border)] p-3">
                <p className="font-medium text-[var(--studio-text-primary)]">{m.eventType.replaceAll("_", " ")}</p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  {new Date(m.occurredAt).toLocaleString()} · {m.source}
                  {m.campaignName ? ` · ${m.campaignName}` : ""}
                </p>
              </li>
            ))}
            {emails.map((m) => (
              <li key={m.id} className="rounded-xl border border-[var(--studio-border)] p-3">
                <p className="font-medium text-[var(--studio-text-primary)]">{m.subject ?? "(no subject)"}</p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  {m.deliveryStatus} · {m.sentAt ? new Date(m.sentAt).toLocaleString() : "not sent"}
                </p>
              </li>
            ))}
            {!emails.length && !campaignEmails.length && (
              <p className="text-[var(--studio-text-tertiary)]">
                No CRM email rows yet. Transactional waitlist email is sent by TG via SendGrid/SMTP; ingest webhooks can populate this
                table later.
              </p>
            )}
          </ul>
        )}

        {tab === "timeline" && (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-3">
                <span className="w-44 shrink-0 text-[11px] text-[var(--studio-text-tertiary)]">{new Date(a.occurredAt).toLocaleString()}</span>
                <span className="text-[var(--studio-text-primary)]">{a.eventType.replaceAll("_", " ")}</span>
                <span className="text-[var(--studio-text-tertiary)]">({a.source})</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "followups" && (
          <ul className="space-y-2 text-sm">
            {followUps.map((f) => (
              <li key={f.id} className="rounded-xl border border-[var(--studio-border)] p-3">
                <p className="font-medium">{f.title}</p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  Due {new Date(f.dueAt).toLocaleDateString()} · {f.priority} · {f.status}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "waitlist" && (
          <pre className="overflow-x-auto rounded-xl bg-[var(--studio-bg-1)] p-3 text-xs text-[var(--studio-text-secondary)]">
            {JSON.stringify(contact.waitlistSnapshot ?? {}, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--studio-text-primary)]">{value}</dd>
    </div>
  );
}