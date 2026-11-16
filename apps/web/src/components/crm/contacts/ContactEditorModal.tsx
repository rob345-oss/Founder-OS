"use client";

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { crmBtnPrimary, crmBtnSecondary } from "@/components/crm/crmUi";
import {
  CRM_ADDRESS_LABELS,
  CRM_COMM_LANGUAGES,
  CRM_COMM_METHODS,
  CRM_COMM_TIMES,
  CRM_EMAIL_LABELS,
  CRM_LIFECYCLE_STAGES,
  CRM_PHONE_LABELS,
  CRM_RELATIONSHIP_CATEGORIES,
  CRM_SOCIAL_PLATFORMS,
  composeFullName,
  contactToProfile,
  emptyContactProfile,
  ensureSinglePrimary,
  newContactMethodId,
  validateContactProfile,
  type CrmContactProfile,
} from "@/lib/crm/contact-profile";
import { createCrmContact, updateCrmContact } from "@/lib/crm/client-api";
import { CRM_RELATIONSHIP_STATUSES, type CrmContact, type CrmRelationshipStatus } from "@/lib/crm/types";

import { ContactAvatar } from "./ContactAvatar";

const fieldClass =
  "w-full rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5 text-sm text-[var(--studio-text-primary)] transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--studio-text-tertiary)] focus:border-[var(--studio-accent)]";

const labelClass = "mb-1 block text-xs font-medium text-[var(--studio-text-secondary)]";

type SectionKey = "methods" | "social" | "addresses" | "communication" | "crm" | "notes";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export function ContactEditorModal({
  open,
  mode,
  contact,
  token,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  contact?: CrmContact | null;
  token: string | null;
  onClose: () => void;
  onSaved: (c: CrmContact) => void;
}) {
  const [profile, setProfile] = useState<CrmContactProfile>(() => emptyContactProfile());
  const [tagsText, setTagsText] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState<CrmRelationshipStatus>("new");
  const [initialNote, setInitialNote] = useState("");
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    methods: false,
    social: false,
    addresses: false,
    communication: false,
    crm: false,
    notes: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const resetFromContact = useCallback((c: CrmContact | null | undefined) => {
    if (c) {
      setProfile(contactToProfile(c));
      setTagsText(c.tags.join(", "));
      setRelationshipStatus(c.relationshipStatus);
    } else {
      setProfile(emptyContactProfile());
      setTagsText("");
      setRelationshipStatus("new");
    }
    setInitialNote("");
    setFieldErrors({});
    setFormError(null);
    setDirty(false);
    setExpanded({ methods: false, social: false, addresses: false, communication: false, crm: false, notes: false });
  }, []);

  useEffect(() => {
    if (open) {
      resetFromContact(mode === "edit" ? contact : null);
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, mode, contact, resetFromContact]);

  const headerLine = useMemo(() => {
    const name = composeFullName(profile.identity);
    const company = profile.identity.company.trim();
    if (name && company) return `${name} · ${company}`;
    return name || company || "New contact";
  }, [profile]);

  function markDirty() {
    setDirty(true);
  }

  function tryClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  }

  function toggleSection(key: SectionKey) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const errors = validateContactProfile(profile);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        profile: { ...profile, version: 1 },
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        relationshipStatus,
        initialNote: mode === "create" ? initialNote.trim() || undefined : undefined,
      };
      const saved =
        mode === "edit" && contact
          ? await updateCrmContact(token, contact.id, body)
          : await createCrmContact(token, body);
      setDirty(false);
      onSaved(saved);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="crm-editor-backdrop fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-label="Close contact editor"
        onClick={tryClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-contact-editor-title"
        className="crm-editor-sheet relative flex max-h-[96dvh] w-full max-w-[min(100%,880px)] flex-col overflow-hidden rounded-t-[var(--crm-radius,14px)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-[var(--studio-shadow-panel)] sm:rounded-[var(--crm-radius,14px)]"
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-[var(--studio-border)] px-5 py-4 sm:px-6">
          <ContactAvatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
              {mode === "edit" ? "Edit contact" : "New contact"}
            </p>
            <h2 id="crm-contact-editor-title" className="truncate text-xl font-semibold tracking-tight text-[var(--studio-text-primary)]">
              {headerLine}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--studio-text-secondary)]">Essentials first — expand sections for more detail.</p>
          </div>
          <button
            type="button"
            onClick={tryClose}
            className="rounded-full p-2 text-[var(--studio-text-secondary)] transition-colors hover:bg-[var(--studio-bg-hover)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
            <Section title="Identity" icon={UserRound} defaultOpen>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" error={fieldErrors.identity}>
                  <input
                    ref={firstFieldRef}
                    className={fieldClass}
                    value={profile.identity.firstName}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, firstName: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    className={fieldClass}
                    value={profile.identity.lastName}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, lastName: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Middle name" className="sm:col-span-1">
                  <input
                    className={fieldClass}
                    value={profile.identity.middleName}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, middleName: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Preferred name">
                  <input
                    className={fieldClass}
                    value={profile.identity.preferredName}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, preferredName: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Organization">
                  <input
                    className={fieldClass}
                    value={profile.identity.company}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, company: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Job title">
                  <input
                    className={fieldClass}
                    value={profile.identity.jobTitle}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, jobTitle: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Department" className="sm:col-span-2">
                  <input
                    className={fieldClass}
                    value={profile.identity.department}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, identity: { ...p.identity, department: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Profile photo (optional)" className="sm:col-span-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="text-sm text-[var(--studio-text-secondary)]"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || file.size > 512_000) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        markDirty();
                        setProfile((p) => ({
                          ...p,
                          identity: { ...p.identity, photoDataUrl: String(reader.result) },
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-[var(--studio-text-tertiary)]">JPEG, PNG, or WebP up to 512 KB — stored privately in CRM.</p>
                </Field>
              </div>
            </Section>

            <Section title="Primary reach" icon={Mail} defaultOpen>
              <EmailRows
                emails={profile.emails}
                errors={fieldErrors}
                onChange={(emails) => {
                  markDirty();
                  setProfile((p) => ({ ...p, emails: ensureSinglePrimary(emails) }));
                }}
              />
            </Section>

            <CollapsibleSection
              title="More contact methods"
              icon={Phone}
              open={expanded.methods}
              onToggle={() => toggleSection("methods")}
            >
              <PhoneRows
                phones={profile.phones}
                errors={fieldErrors}
                onChange={(phones) => {
                  markDirty();
                  setProfile((p) => ({ ...p, phones: ensureSinglePrimary(phones) }));
                }}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Social & web"
              icon={Link2}
              open={expanded.social}
              onToggle={() => toggleSection("social")}
            >
              <SocialRows
                links={profile.socialLinks}
                errors={fieldErrors}
                onChange={(socialLinks) => {
                  markDirty();
                  setProfile((p) => ({ ...p, socialLinks }));
                }}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Addresses"
              icon={MapPin}
              open={expanded.addresses}
              onToggle={() => toggleSection("addresses")}
            >
              <AddressRows
                addresses={profile.addresses}
                onChange={(addresses) => {
                  markDirty();
                  setProfile((p) => ({ ...p, addresses }));
                }}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Preferred communication"
              icon={MessageSquare}
              open={expanded.communication}
              onToggle={() => toggleSection("communication")}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Preferred contact method">
                  <select
                    className={fieldClass}
                    value={profile.communication.preferredMethod}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: { ...p.communication, preferredMethod: e.target.value as CrmContactProfile["communication"]["preferredMethod"] },
                      }));
                    }}
                  >
                    {CRM_COMM_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Linked email or phone">
                  <select
                    className={fieldClass}
                    value={profile.communication.preferredMethodRefId ?? ""}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: { ...p.communication, preferredMethodRefId: e.target.value || null },
                      }));
                    }}
                  >
                    <option value="">—</option>
                    {profile.emails.filter((x) => x.address.trim()).map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.address}
                      </option>
                    ))}
                    {profile.phones.filter((x) => x.number.trim()).map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.countryCallingCode} {ph.number}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Best time">
                  <select
                    className={fieldClass}
                    value={profile.communication.preferredTime}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: { ...p.communication, preferredTime: e.target.value as CrmContactProfile["communication"]["preferredTime"] },
                      }));
                    }}
                  >
                    {CRM_COMM_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Language">
                  <select
                    className={fieldClass}
                    value={profile.communication.preferredLanguage}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: {
                          ...p.communication,
                          preferredLanguage: e.target.value as CrmContactProfile["communication"]["preferredLanguage"],
                        },
                      }));
                    }}
                  >
                    {CRM_COMM_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Time zone" className="sm:col-span-2">
                  <select
                    className={fieldClass}
                    value={profile.communication.timezone}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: { ...p.communication, timezone: e.target.value },
                      }));
                    }}
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Communication notes" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    className={fieldClass}
                    value={profile.communication.notes}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        communication: { ...p.communication, notes: e.target.value },
                      }));
                    }}
                    placeholder="Prefers WhatsApp messages in the afternoon…"
                  />
                  <p className="mt-1 text-[11px] text-[var(--studio-text-tertiary)]">
                    Operational preference only — not marketing consent.
                  </p>
                </Field>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="CRM details" icon={GripVertical} open={expanded.crm} onToggle={() => toggleSection("crm")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Lifecycle stage">
                  <select
                    className={fieldClass}
                    value={profile.crm.lifecycleStage}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        crm: { ...p.crm, lifecycleStage: e.target.value as CrmContactProfile["crm"]["lifecycleStage"] },
                      }));
                    }}
                  >
                    {CRM_LIFECYCLE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Relationship category">
                  <select
                    className={fieldClass}
                    value={profile.crm.relationshipCategory}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({
                        ...p,
                        crm: {
                          ...p.crm,
                          relationshipCategory: e.target.value as CrmContactProfile["crm"]["relationshipCategory"],
                        },
                      }));
                    }}
                  >
                    {CRM_RELATIONSHIP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Relationship status">
                  <select
                    className={fieldClass}
                    value={relationshipStatus}
                    onChange={(e) => {
                      markDirty();
                      setRelationshipStatus(e.target.value as CrmRelationshipStatus);
                    }}
                  >
                    {CRM_RELATIONSHIP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Lead source">
                  <input
                    className={fieldClass}
                    value={profile.crm.leadSource}
                    onChange={(e) => {
                      markDirty();
                      setProfile((p) => ({ ...p, crm: { ...p.crm, leadSource: e.target.value } }));
                    }}
                  />
                </Field>
                <Field label="Tags (comma-separated)" className="sm:col-span-2">
                  <input
                    className={fieldClass}
                    value={tagsText}
                    onChange={(e) => {
                      markDirty();
                      setTagsText(e.target.value);
                    }}
                    placeholder="pilot, nyc, caregiver"
                  />
                </Field>
              </div>
            </CollapsibleSection>

            {mode === "create" && (
              <CollapsibleSection title="Notes" icon={MessageSquare} open={expanded.notes} onToggle={() => toggleSection("notes")}>
                <textarea
                  rows={4}
                  className={fieldClass}
                  value={initialNote}
                  onChange={(e) => {
                    markDirty();
                    setInitialNote(e.target.value);
                  }}
                  placeholder="Private CRM note (optional)…"
                />
              </CollapsibleSection>
            )}
          </div>

          <footer className="flex shrink-0 flex-col gap-2 border-t border-[var(--studio-border)] bg-[var(--studio-bg-2)]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {formError ? (
              <p className="text-sm text-[var(--studio-danger)]">{formError}</p>
            ) : (
              <span className="text-xs text-[var(--studio-text-tertiary)]">Private CRM record — not shared publicly.</span>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <button type="button" onClick={tryClose} className={crmBtnSecondary} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className={crmBtnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save contact"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--studio-bg-hover)]"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="h-4 w-4 text-[var(--studio-accent)]" strokeWidth={1.75} />
        <span className="flex-1 text-sm font-semibold text-[var(--studio-text-primary)]">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--studio-text-tertiary)]" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="border-t border-[var(--studio-border)] px-4 py-4">{children}</div>}
    </section>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--studio-bg-hover)]"
        onClick={onToggle}
      >
        <Icon className="h-4 w-4 text-[var(--studio-accent)]" strokeWidth={1.75} />
        <span className="flex-1 text-sm font-semibold text-[var(--studio-text-primary)]">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--studio-text-tertiary)]" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="border-t border-[var(--studio-border)] px-4 py-4">{children}</div>}
    </section>
  );
}

function Field({
  label,
  children,
  error,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-[var(--studio-danger)]">{error}</span> : null}
    </label>
  );
}

function EmailRows({
  emails,
  errors,
  onChange,
}: {
  emails: CrmContactProfile["emails"];
  errors: Record<string, string>;
  onChange: (emails: CrmContactProfile["emails"]) => void;
}) {
  return (
    <div className="space-y-3">
      {emails.map((em, idx) => (
        <div key={em.id} className="grid gap-2 rounded-xl border border-[var(--studio-border)]/80 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Field label={idx === 0 ? "Email" : "Additional email"} error={errors[`email:${em.id}`] ?? (idx === 0 ? errors.emails : undefined)}>
            <input
              type="email"
              className={fieldClass}
              value={em.address}
              onChange={(e) => onChange(emails.map((x) => (x.id === em.id ? { ...x, address: e.target.value } : x)))}
            />
          </Field>
          <Field label="Label">
            <select
              className={fieldClass}
              value={em.label}
              onChange={(e) =>
                onChange(emails.map((x) => (x.id === em.id ? { ...x, label: e.target.value as typeof em.label } : x)))
              }
            >
              {CRM_EMAIL_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-xs text-[var(--studio-text-secondary)]">
            <input
              type="radio"
              name="primary-email"
              checked={em.isPrimary}
              onChange={() => onChange(emails.map((x) => ({ ...x, isPrimary: x.id === em.id })))}
            />
            Primary
          </label>
          {emails.length > 1 ? (
            <button
              type="button"
              className="mb-1 flex items-center justify-center rounded-lg p-2 text-[var(--studio-danger)] hover:bg-[var(--studio-bg-hover)]"
              onClick={() => onChange(emails.filter((x) => x.id !== em.id))}
              aria-label="Remove email"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--studio-accent)]"
        onClick={() => onChange([...emails, { id: newContactMethodId(), address: "", label: "personal", isPrimary: false }])}
      >
        <Plus className="h-4 w-4" /> Add email
      </button>
    </div>
  );
}

function PhoneRows({
  phones,
  errors,
  onChange,
}: {
  phones: CrmContactProfile["phones"];
  errors: Record<string, string>;
  onChange: (phones: CrmContactProfile["phones"]) => void;
}) {
  return (
    <div className="space-y-3">
      {phones.map((ph, idx) => (
        <div key={ph.id} className="grid gap-2 rounded-xl border border-[var(--studio-border)]/80 p-3 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-end">
          <Field label="Code">
            <input
              className={`${fieldClass} max-w-[6rem]`}
              value={ph.countryCallingCode}
              onChange={(e) => onChange(phones.map((x) => (x.id === ph.id ? { ...x, countryCallingCode: e.target.value } : x)))}
            />
          </Field>
          <Field label={idx === 0 ? "Phone number" : "Additional number"} error={idx === 0 ? errors.phones : undefined}>
            <input
              type="tel"
              className={fieldClass}
              value={ph.number}
              onChange={(e) => onChange(phones.map((x) => (x.id === ph.id ? { ...x, number: e.target.value } : x)))}
            />
          </Field>
          <Field label="Label">
            <select
              className={fieldClass}
              value={ph.label}
              onChange={(e) =>
                onChange(phones.map((x) => (x.id === ph.id ? { ...x, label: e.target.value as typeof ph.label } : x)))
              }
            >
              {CRM_PHONE_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-xs text-[var(--studio-text-secondary)]">
            <input
              type="radio"
              name="primary-phone"
              checked={ph.isPrimary}
              onChange={() => onChange(phones.map((x) => ({ ...x, isPrimary: x.id === ph.id })))}
            />
            Primary
          </label>
          {phones.length > 1 ? (
            <button
              type="button"
              className="mb-1 flex items-center justify-center rounded-lg p-2 text-[var(--studio-danger)] hover:bg-[var(--studio-bg-hover)]"
              onClick={() => onChange(phones.filter((x) => x.id !== ph.id))}
              aria-label="Remove phone"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--studio-accent)]"
        onClick={() =>
          onChange([...phones, { id: newContactMethodId(), number: "", countryCallingCode: "+1", label: "mobile", isPrimary: false }])
        }
      >
        <Plus className="h-4 w-4" /> Add phone number
      </button>
    </div>
  );
}

function SocialRows({
  links,
  errors,
  onChange,
}: {
  links: CrmContactProfile["socialLinks"];
  errors: Record<string, string>;
  onChange: (links: CrmContactProfile["socialLinks"]) => void;
}) {
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div key={link.id} className="grid gap-2 rounded-xl border border-[var(--studio-border)]/80 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <Field label="Platform">
            <select
              className={fieldClass}
              value={link.platform}
              onChange={(e) =>
                onChange(links.map((x) => (x.id === link.id ? { ...x, platform: e.target.value as typeof link.platform } : x)))
              }
            >
              {CRM_SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="URL" error={errors[`social:${link.id}`]}>
            <input
              className={fieldClass}
              value={link.url}
              placeholder="https://"
              onChange={(e) => onChange(links.map((x) => (x.id === link.id ? { ...x, url: e.target.value } : x)))}
            />
          </Field>
          <button
            type="button"
            className="mb-1 flex items-center justify-center rounded-lg p-2 text-[var(--studio-danger)] hover:bg-[var(--studio-bg-hover)]"
            onClick={() => onChange(links.filter((x) => x.id !== link.id))}
            aria-label="Remove link"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--studio-accent)]"
        onClick={() => onChange([...links, { id: newContactMethodId(), platform: "linkedin", url: "" }])}
      >
        <Plus className="h-4 w-4" /> Add social link
      </button>
    </div>
  );
}

function AddressRows({
  addresses,
  onChange,
}: {
  addresses: CrmContactProfile["addresses"];
  onChange: (addresses: CrmContactProfile["addresses"]) => void;
}) {
  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div key={addr.id} className="space-y-2 rounded-xl border border-[var(--studio-border)]/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <Field label="Label" className="flex-1">
              <select
                className={fieldClass}
                value={addr.label}
                onChange={(e) =>
                  onChange(addresses.map((x) => (x.id === addr.id ? { ...x, label: e.target.value as typeof addr.label } : x)))
                }
              >
                {CRM_ADDRESS_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              className="mt-5 rounded-lg p-2 text-[var(--studio-danger)] hover:bg-[var(--studio-bg-hover)]"
              onClick={() => onChange(addresses.filter((x) => x.id !== addr.id))}
              aria-label="Remove address"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Street">
              <input
                className={fieldClass}
                value={addr.street}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, street: e.target.value } : x)))}
              />
            </Field>
            <Field label="Apt / Suite">
              <input
                className={fieldClass}
                value={addr.unit}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, unit: e.target.value } : x)))}
              />
            </Field>
            <Field label="City">
              <input
                className={fieldClass}
                value={addr.city}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, city: e.target.value } : x)))}
              />
            </Field>
            <Field label="State / Region">
              <input
                className={fieldClass}
                value={addr.region}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, region: e.target.value } : x)))}
              />
            </Field>
            <Field label="Postal code">
              <input
                className={fieldClass}
                value={addr.postalCode}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, postalCode: e.target.value } : x)))}
              />
            </Field>
            <Field label="Country">
              <input
                className={fieldClass}
                value={addr.country}
                onChange={(e) => onChange(addresses.map((x) => (x.id === addr.id ? { ...x, country: e.target.value } : x)))}
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--studio-accent)]"
        onClick={() =>
          onChange([
            ...addresses,
            {
              id: newContactMethodId(),
              label: "home",
              street: "",
              unit: "",
              city: "",
              region: "",
              postalCode: "",
              country: "",
            },
          ])
        }
      >
        <Plus className="h-4 w-4" /> Add address
      </button>
    </div>
  );
}