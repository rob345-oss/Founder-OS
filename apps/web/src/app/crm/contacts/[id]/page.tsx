"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { CONTACT_TYPE_OPTIONS, LIFECYCLE_OPTIONS, type ContactTypeOption, type LifecycleOption } from "@/lib/crm/contact-form";
import { addCrmNote, fetchCrmContact, updateCrmContact } from "@/lib/crm/client-api";
import { fetchContactEmailActivity } from "@/lib/crm/email-client-api";
import type { CrmEmailActivityItem } from "@/lib/crm/email/types";
import type { CrmActivity, CrmContact, CrmEmailMessage, CrmFollowUp, CrmNote } from "@/lib/crm/types";

export default function CrmContactProfilePage() {
  const params = useParams<{ id: string }>();
  const { token } = useCrmSession();
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [emails, setEmails] = useState<CrmEmailMessage[]>([]);
  const [followUps, setFollowUps] = useState<CrmFollowUp[]>([]);
  const [emailActivity, setEmailActivity] = useState<CrmEmailActivityItem[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [tab, setTab] = useState<"overview" | "notes" | "emails" | "timeline" | "followups" | "waitlist">("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    organization: "",
    contactType: "general_contact" as ContactTypeOption,
    lifecycle: "new_lead" as LifecycleOption,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const data = await fetchCrmContact(token, params.id);
    setContact(data.contact);
    setNotes(data.notes);
    setActivities(data.activities);
    setEmails(data.emails);
    setFollowUps(data.followUps);
    setEmailActivity(await fetchContactEmailActivity(token, params.id));
    setEditForm({
      fullName: data.contact.fullName,
      phone: data.contact.phone ?? "",
      organization: data.contact.organization ?? "",
      contactType: (data.contact.classifications[0] ?? "general_contact") as ContactTypeOption,
      lifecycle: mapPipelineToLifecycle(data.contact.pipelineStage),
    });
  }, [token, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !params.id) return;
    const lifecycle = LIFECYCLE_OPTIONS.find((o) => o.value === editForm.lifecycle);
    setSaving(true);
    try {
      await updateCrmContact(token, params.id, {
        fullName: editForm.fullName,
        phone: editForm.phone || null,
        organization: editForm.organization || null,
        classifications: [editForm.contactType],
        relationshipStatus: lifecycle?.relationshipStatus,
        pipelineStage: lifecycle?.pipelineStage,
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !params.id || !noteBody.trim()) return;
    await addCrmNote(token, params.id, noteBody);
    setNoteBody("");
    await load();
  }

  if (!contact) {
    return <div className="p-10 text-sm text-[var(--studio-text-secondary)]">Loading profile…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">Contact</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--studio-text-primary)]">{contact.fullName || contact.primaryEmail}</h1>
        <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{contact.primaryEmail}</p>
        <p className="mt-2 text-xs text-[var(--studio-text-tertiary)]">
          Created {new Date(contact.createdAt).toLocaleString()} · Updated {new Date(contact.updatedAt).toLocaleString()}
        </p>
        <ProfileEditControls editing={editing} onToggle={() => setEditing((v) => !v)} />
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge>{contact.relationshipStatus.replaceAll("_", " ")}</Badge>
          {contact.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
          {contact.contactSource && <Badge>{contact.contactSource}</Badge>}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["notes", "Notes"],
            ["emails", "Email activity"],
            ["timeline", "Timeline"],
            ["followups", "Follow-ups"],
            ["waitlist", "Waitlist"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "rounded-full border px-3 py-1 text-xs",
              tab === key
                ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]"
                : "border-[var(--studio-border)] text-[var(--studio-text-secondary)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        {tab === "overview" && (
          <div className="space-y-4">
            {editing ? (
              <form onSubmit={(e) => void onSaveProfile(e)} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  Full name
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  Phone
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  Organization
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
                    value={editForm.organization}
                    onChange={(e) => setEditForm((f) => ({ ...f, organization: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  Contact type
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
                    value={editForm.contactType}
                    onChange={(e) => setEditForm((f) => ({ ...f, contactType: e.target.value as ContactTypeOption }))}
                  >
                    {CONTACT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Lifecycle
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
                    value={editForm.lifecycle}
                    onChange={(e) => setEditForm((f) => ({ ...f, lifecycle: e.target.value as LifecycleOption }))}
                  >
                    {LIFECYCLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving} className="rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-xs font-medium text-white">
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="Phone" value={contact.phone ?? "—"} />
                <Field label="Organization" value={contact.organization ?? "—"} />
                <Field label="Country" value={contact.countryCode ?? "—"} />
                <Field label="Pipeline" value={contact.pipelineStage.replaceAll("_", " ")} />
                <Field label="Classifications" value={contact.classifications.join(", ") || "—"} />
                <Field label="Preferences" value={JSON.stringify(contact.contactPreferences ?? {})} />
                <Field label="Next follow-up" value={contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toLocaleString() : "—"} />
              </dl>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">
            <form onSubmit={(e) => void onAddNote(e)} className="space-y-2">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Internal note…"
                className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-xs font-medium text-white">
                Add note
              </button>
            </form>
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3 text-sm">
                  <p className="whitespace-pre-wrap text-[var(--studio-text-primary)]">{n.body}</p>
                  <p className="mt-2 text-[11px] text-[var(--studio-text-tertiary)]">{new Date(n.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "emails" && (
          <ul className="space-y-2 text-sm">
            {emailActivity.map((item) => (
              <li key={item.id} className="rounded-md border border-[var(--studio-border)] p-3">
                <p className="font-medium text-[var(--studio-text-primary)]">
                  {item.eventType.replaceAll("_", " ")}
                  {item.campaignName ? ` · ${item.campaignName}` : ""}
                </p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  {new Date(item.occurredAt).toLocaleString()} · {item.source}
                </p>
              </li>
            ))}
            {emails.map((m) => (
              <li key={m.id} className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3">
                <p className="font-medium text-[var(--studio-text-primary)]">{m.subject ?? "(no subject)"}</p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  {m.deliveryStatus} · {m.sentAt ? new Date(m.sentAt).toLocaleString() : "not sent"}
                </p>
              </li>
            ))}
            {!emailActivity.length && !emails.length && (
              <p className="text-[var(--studio-text-tertiary)]">No email activity recorded for this contact yet.</p>
            )}
          </ul>
        )}

        {tab === "timeline" && (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="w-40 shrink-0 text-[11px] text-[var(--studio-text-tertiary)]">{new Date(a.occurredAt).toLocaleString()}</span>
                <span className="text-[var(--studio-text-primary)]">{a.eventType.replaceAll("_", " ")}</span>
                <span className="text-[var(--studio-text-tertiary)]">({a.source})</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "followups" && (
          <ul className="space-y-2 text-sm">
            {followUps.map((f) => (
              <li key={f.id} className="rounded-md border border-[var(--studio-border)] p-3">
                <p className="font-medium">{f.title}</p>
                <p className="text-xs text-[var(--studio-text-tertiary)]">
                  Due {new Date(f.dueAt).toLocaleDateString()} · {f.priority} · {f.status}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "waitlist" && (
          <pre className="overflow-x-auto rounded-md bg-[var(--studio-bg-1)] p-3 text-xs text-[var(--studio-text-secondary)]">
            {JSON.stringify(contact.waitlistSnapshot ?? {}, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-2 py-0.5 text-[var(--studio-text-secondary)]">
      {children}
    </span>
  );
}

function mapPipelineToLifecycle(stage: string): LifecycleOption {
  const match = LIFECYCLE_OPTIONS.find((o) => o.pipelineStage === stage);
  return match?.value ?? "new_lead";
}

function ProfileEditControls({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 rounded-md border border-[var(--studio-border)] px-3 py-1 text-xs text-[var(--studio-text-secondary)]"
    >
      {editing ? "Cancel edit" : "Edit profile"}
    </button>
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
