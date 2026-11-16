"use client";

import { useMemo, useState } from "react";

import { crmBtnPrimary } from "@/components/crm/crmUi";
import type { EmailBlock, EmailLocale } from "@/lib/crm/email/types";
import { defaultEmailBlocks, renderBlocksToHtml, renderBlocksToText } from "@/lib/crm/email/blocks";
import { applyPersonalization } from "@/lib/crm/email/personalize";
import type { CrmEmailLabel } from "@/lib/crm/email/types";

type Props = {
  labels: CrmEmailLabel[];
  initial?: {
    name: string;
    subject: string;
    previewText: string;
    locale: EmailLocale;
    fromName: string;
    blocks: EmailBlock[];
    labelIds: string[];
  };
  onSave: (payload: {
    name: string;
    subject: string;
    previewText: string;
    locale: EmailLocale;
    fromName: string;
    blocks: EmailBlock[];
    labelIds: string[];
  }) => Promise<void> | void;
};

const SAMPLE_FIELDS = { first_name: "Alex", full_name: "Alex Rivera", company_name: "Rivera Family" };

export function EmailComposer({ labels, initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "New template");
  const [subject, setSubject] = useState(initial?.subject ?? "Hello, {{first_name}}");
  const [previewText, setPreviewText] = useState(initial?.previewText ?? "");
  const [locale, setLocale] = useState<EmailLocale>(initial?.locale ?? "en");
  const [fromName, setFromName] = useState(initial?.fromName ?? "Titanium Guardian");
  const [blocks, setBlocks] = useState<EmailBlock[]>(initial?.blocks ?? defaultEmailBlocks("en"));
  const [labelIds, setLabelIds] = useState<string[]>(initial?.labelIds ?? []);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);

  const htmlPreview = useMemo(() => {
    const fields = SAMPLE_FIELDS;
    const personalized = blocks.map((b) => {
      if (b.type === "heading" || b.type === "paragraph") {
        return { ...b, text: applyPersonalization(b.text, fields) };
      }
      if (b.type === "button") {
        return { ...b, label: applyPersonalization(b.label, fields) };
      }
      return b;
    });
    return renderBlocksToHtml(personalized as EmailBlock[]);
  }, [blocks]);

  const textPreview = useMemo(() => renderBlocksToText(blocks), [blocks]);

  function updateBlock(index: number, patch: Partial<EmailBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } as EmailBlock : b)));
  }

  function addBlock(type: EmailBlock["type"]) {
    const block: EmailBlock =
      type === "heading"
        ? { type: "heading", level: 2, text: locale === "es" ? "Nuevo bloque" : "New section" }
        : type === "paragraph"
          ? { type: "paragraph", text: locale === "es" ? "Escriba su mensaje aquí." : "Write your message here." }
          : type === "button"
            ? { type: "button", label: locale === "es" ? "Ver más" : "Learn more", href: "https://titaniumguardian.com" }
            : type === "divider"
              ? { type: "divider" }
              : { type: "spacer", height: 16 };
    setBlocks((prev) => [...prev, block]);
  }

  function applyLocale(next: EmailLocale) {
    setLocale(next);
    if (!initial) setBlocks(defaultEmailBlocks(next));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name, subject, previewText, locale, fromName, blocks, labelIds });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Template name" value={name} onChange={setName} />
          <Field label="From name" value={fromName} onChange={setFromName} />
          <Field label="Subject" value={subject} onChange={setSubject} className="sm:col-span-2" />
          <Field label="Preview text" value={previewText} onChange={setPreviewText} className="sm:col-span-2" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--studio-text-tertiary)]">Language</span>
          {(["en", "es"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => applyLocale(code)}
              className={[
                "rounded-full border px-3 py-1 text-xs",
                locale === code ? "border-[var(--studio-accent)] text-[var(--studio-accent)]" : "border-[var(--studio-border)]",
              ].join(" ")}
            >
              {code === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {labels.map((label) => {
            const active = labelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  setLabelIds((prev) => (active ? prev.filter((id) => id !== label.id) : [...prev, label.id]))
                }
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: active ? label.color : "var(--studio-border)",
                  color: active ? label.color : "var(--studio-text-secondary)",
                  background: active ? `${label.color}18` : "transparent",
                }}
              >
                {label.name}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--studio-text-tertiary)]">Content blocks</p>
          {blocks.map((block, index) => (
            <div key={index} className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3">
              <p className="mb-2 text-[11px] uppercase text-[var(--studio-text-tertiary)]">{block.type}</p>
              {(block.type === "heading" || block.type === "paragraph") && (
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(index, { text: e.target.value })}
                  rows={block.type === "paragraph" ? 3 : 2}
                  className="w-full rounded border border-[var(--studio-border)] bg-transparent px-2 py-1.5 text-sm"
                />
              )}
              {block.type === "button" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={block.label}
                    onChange={(e) => updateBlock(index, { label: e.target.value })}
                    placeholder="Button label"
                    className="rounded border border-[var(--studio-border)] bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    value={block.href}
                    onChange={(e) => updateBlock(index, { href: e.target.value })}
                    placeholder="https://"
                    className="rounded border border-[var(--studio-border)] bg-transparent px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["paragraph", "heading", "button", "divider", "spacer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addBlock(t)}
              className="rounded-md border border-[var(--studio-border)] px-2.5 py-1 text-xs text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]"
            >
              + {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className={crmBtnPrimary}
        >
          {saving ? "Saving…" : "Save template"}
        </button>
      </div>

      <aside className="space-y-3">
        <div className="flex gap-2">
          {(["desktop", "mobile"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              className={[
                "flex-1 rounded-md border px-2 py-1 text-xs",
                previewMode === mode ? "border-[var(--studio-accent)] text-[var(--studio-accent)]" : "border-[var(--studio-border)]",
              ].join(" ")}
            >
              {mode}
            </button>
          ))}
        </div>
        <div
          className={[
            "mx-auto overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-white shadow-sm",
            previewMode === "mobile" ? "max-w-[390px]" : "w-full",
          ].join(" ")}
        >
          <iframe title="Email HTML preview" srcDoc={htmlPreview} className="min-h-[480px] w-full border-0 bg-white" />
        </div>
        <details className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-3 text-xs text-[var(--studio-text-secondary)]">
          <summary className="cursor-pointer font-medium text-[var(--studio-text-primary)]">Plain-text version</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{applyPersonalization(textPreview, SAMPLE_FIELDS)}</pre>
        </details>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={["block text-sm", className].filter(Boolean).join(" ")}>
      <span className="mb-1 block text-xs text-[var(--studio-text-tertiary)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2"
      />
    </label>
  );
}
