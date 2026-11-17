"use client";

import { Plus, Trash2 } from "lucide-react";

import {
  CRM_PHONE_LABELS,
  emptyContactProfile,
  newContactMethodId,
  type CrmContactPhoneEntry,
} from "@/lib/crm/contact-profile";
import { parseCrmPhoneEntry } from "@/lib/crm/contact-phone";

import { CountryCallingCodeSelect } from "./CountryCallingCodeSelect";

const fieldClass =
  "w-full rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5 text-sm text-[var(--studio-text-primary)]";

const labelClass = "mb-1 block text-xs font-medium text-[var(--studio-text-secondary)]";

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-[var(--studio-danger)]">{error}</span> : null}
    </label>
  );
}

export function ContactPhoneFields({
  phones,
  errors,
  onChange,
}: {
  phones: CrmContactPhoneEntry[];
  errors: Record<string, string>;
  onChange: (phones: CrmContactPhoneEntry[]) => void;
}) {
  return (
    <div className="space-y-3">
      {phones.map((ph, idx) => {
        const parsed = parseCrmPhoneEntry(ph.countryIso, ph.number, ph.countryCallingCode, ph.extension);
        return (
          <div key={ph.id} className="space-y-2 rounded-xl border border-[var(--studio-border)]/80 p-3">
            <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
              <Field label={idx === 0 ? "Country" : "Country"}>
                <CountryCallingCodeSelect
                  iso={ph.countryIso}
                  onChange={(c) =>
                    onChange(
                      phones.map((x) =>
                        x.id === ph.id
                          ? { ...x, countryIso: c.iso, countryCallingCode: c.callingCode }
                          : x,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={idx === 0 ? "National number" : "Number"} error={errors[`phone:${ph.id}`] ?? (idx === 0 ? errors.phones : undefined)}>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className={fieldClass}
                  placeholder="202 555 0100"
                  value={ph.number}
                  onChange={(e) => {
                    const next = phones.map((x) => (x.id === ph.id ? { ...x, number: e.target.value } : x));
                    onChange(next);
                  }}
                  onBlur={() => {
                    const n = parseCrmPhoneEntry(ph.countryIso, ph.number, ph.countryCallingCode, ph.extension);
                    onChange(
                      phones.map((x) =>
                        x.id === ph.id
                          ? {
                              ...x,
                              number: n.nationalNumber || x.number,
                              e164: n.e164,
                              countryIso: n.countryIso,
                              countryCallingCode: n.countryCallingCode,
                            }
                          : x,
                      ),
                    );
                  }}
                />
              </Field>
              <Field label="Extension">
                <input
                  className={fieldClass}
                  placeholder="ext."
                  value={ph.extension}
                  onChange={(e) => onChange(phones.map((x) => (x.id === ph.id ? { ...x, extension: e.target.value } : x)))}
                />
              </Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <Field label="Type">
                <select
                  className={fieldClass}
                  value={ph.label}
                  onChange={(e) =>
                    onChange(
                      phones.map((x) =>
                        x.id === ph.id
                          ? {
                              ...x,
                              label: e.target.value as CrmContactPhoneEntry["label"],
                              whatsAppAvailable: e.target.value === "whatsapp" ? true : x.whatsAppAvailable,
                            }
                          : x,
                      ),
                    )
                  }
                >
                  {CRM_PHONE_LABELS.map((l) => (
                    <option key={l} value={l}>
                      {l.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 pb-2 text-xs text-[var(--studio-text-secondary)]">
                <input
                  type="checkbox"
                  checked={ph.whatsAppAvailable}
                  onChange={(e) => onChange(phones.map((x) => (x.id === ph.id ? { ...x, whatsAppAvailable: e.target.checked } : x)))}
                />
                WhatsApp
              </label>
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
              ) : null}
            </div>
            {parsed.valid && ph.number.trim() ? (
              <p className="text-[11px] text-[var(--studio-text-tertiary)]">E.164: {parsed.e164}</p>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--studio-accent)]"
        onClick={() => {
          const base = emptyContactProfile().phones[0];
          onChange([...phones, { ...base, id: newContactMethodId(), isPrimary: false, number: "" }]);
        }}
      >
        <Plus className="h-4 w-4" /> Add phone number
      </button>
    </div>
  );
}