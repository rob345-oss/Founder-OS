"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  CONTACT_TYPE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LIFECYCLE_OPTIONS,
  type ContactFormInput,
  type ContactTypeOption,
  type LifecycleOption,
  validateContactForm,
} from "@/lib/crm/contact-form";
import { checkCrmContactDuplicates, createCrmContact } from "@/lib/crm/client-api";
import type { DuplicateMatch } from "@/lib/crm/duplicate-match";

type Props = {
  token: string | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const initialForm: ContactFormInput = {
  firstName: "",
  lastName: "",
  primaryEmail: "",
  phone: "",
  countryCode: "",
  organization: "",
  contactType: "general_contact",
  lifecycle: "new_lead",
  leadSource: "manual",
  tags: [],
  marketingConsent: null,
};

export function AddContactDialog({ token, open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<ContactFormInput>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setFieldErrors({});
      setDuplicates([]);
      setError(null);
    }
  }, [open]);

  const checkDuplicates = useCallback(async () => {
    if (!token) return;
    const validation = validateContactForm(form);
    if (!validation.ok) return;
    const result = await checkCrmContactDuplicates(token, {
      primaryEmail: form.primaryEmail,
      phone: form.phone,
    });
    setDuplicates(result);
  }, [form, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkDuplicates();
    }, 400);
    return () => clearTimeout(timer);
  }, [checkDuplicates]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const validation = validateContactForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCrmContact(token, form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <ApplicationModalPanel
        title="Add contact"
        onClose={onClose}
        onSubmit={(e) => void onSubmit(e)}
        saving={saving}
        fieldErrors={fieldErrors}
        duplicates={duplicates}
        form={form}
        setForm={setForm}
        error={error}
      />
    </div>
  );
}

function ApplicationModalPanel({
  title,
  onClose,
  onSubmit,
  saving,
  fieldErrors,
  duplicates,
  form,
  setForm,
  error,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  fieldErrors: Record<string, string>;
  duplicates: DuplicateMatch[];
  form: ContactFormInput;
  setForm: React.Dispatch<React.SetStateAction<ContactFormInput>>;
  error: string | null;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-6 shadow-xl"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">{title}</h2>
        <button type="button" onClick={onClose} className="text-sm text-[var(--studio-text-tertiary)] hover:text-[var(--studio-text-primary)]">
          Close
        </button>
      </header>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <input
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.firstName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </Field>
          <Field label="Last name">
            <input
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.lastName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.primaryEmail ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
            />
            {fieldErrors.primaryEmail && <ErrorText>{fieldErrors.primaryEmail}</ErrorText>}
          </Field>
          <Field label="Phone">
            <input
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field label="Country">
            <input
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.countryCode ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
            />
          </Field>
          <Field label="Organization">
            <input
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.organization ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Contact type">
            <select
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.contactType}
              onChange={(e) => setForm((f) => ({ ...f, contactType: e.target.value as ContactTypeOption }))}
            >
              {CONTACT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lifecycle">
            <select
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.lifecycle}
              onChange={(e) => setForm((f) => ({ ...f, lifecycle: e.target.value as LifecycleOption }))}
            >
              {LIFECYCLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lead source">
            <select
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              value={form.leadSource}
              onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))}
            >
              {LEAD_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {fieldErrors.contact && <ErrorText>{fieldErrors.contact}</ErrorText>}

        {duplicates.length > 0 && (
          <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100">
            <p className="font-medium">Possible duplicates</p>
            <ul className="mt-2 space-y-1">
              {duplicates.map((d) => (
                <li key={`${d.contactId}-${d.reason}`}>
                  <Link href={`/crm/contacts/${d.contactId}`} className="underline">
                    {d.fullName || d.primaryEmail}
                  </Link>
                  <span className="text-amber-200/80"> · {d.reason.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-[var(--studio-border)] px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--studio-accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create contact"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--studio-text-tertiary)]">{label}</span>
      {children}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-300">{children}</p>;
}