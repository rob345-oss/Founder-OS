"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AddContactDialog } from "@/components/crm/AddContactDialog";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { CONTACT_TYPE_OPTIONS, LEAD_SOURCE_OPTIONS, LIFECYCLE_OPTIONS } from "@/lib/crm/contact-form";
import { fetchCrmContacts } from "@/lib/crm/client-api";
import { CRM_CLASSIFICATIONS, CRM_PIPELINE_STAGES, CRM_RELATIONSHIP_STATUSES, type CrmContactListItem } from "@/lib/crm/types";

export default function CrmContactsPage() {
  const { token } = useCrmSession();
  const [q, setQ] = useState("");
  const [classification, setClassification] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [pipelineStage, setPipelineStage] = useState("");
  const [source, setSource] = useState("");
  const [items, setItems] = useState<CrmContactListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchCrmContacts(token, {
        q,
        classification: classification || undefined,
        relationshipStatus: relationshipStatus || undefined,
        pipelineStage: pipelineStage || undefined,
        source: source || undefined,
        limit: 100,
        sort: "last_interaction",
        direction: "desc",
      });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [token, q, classification, relationshipStatus, pipelineStage, source]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--studio-text-primary)]">Contacts</h1>
          <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{total} total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Add contact
        </button>
      </header>

      <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone"
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2 text-sm text-[var(--studio-text-primary)] lg:col-span-2"
        />
        <FilterSelect value={classification} onChange={setClassification} options={CRM_CLASSIFICATIONS.map((v) => ({ value: v, label: v }))} label="Classification" />
        <FilterSelect
          value={relationshipStatus}
          onChange={setRelationshipStatus}
          options={CRM_RELATIONSHIP_STATUSES.map((v) => ({ value: v, label: v }))}
          label="Relationship"
        />
        <FilterSelect value={pipelineStage} onChange={setPipelineStage} options={CRM_PIPELINE_STAGES.map((v) => ({ value: v, label: v }))} label="Pipeline" />
        <FilterSelect value={source} onChange={setSource} options={LEAD_SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} label="Source" />
      </div>

      <AddContactDialog token={token} open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => void load()} />

      <div className="overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)] text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-[var(--studio-border)]/60 hover:bg-[var(--studio-bg-hover)]">
                <td className="px-4 py-3">
                  <Link href={`/crm/contacts/${c.id}`} className="font-medium text-[var(--studio-text-primary)] hover:underline">
                    {c.fullName || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.primaryEmail}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.classifications[0] ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.contactSource ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.relationshipStatus.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.pipelineStage.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-[var(--studio-text-tertiary)]">{new Date(c.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="p-6 text-sm text-[var(--studio-text-tertiary)]">No contacts found.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[var(--studio-text-tertiary)]">
        Manual types: {CONTACT_TYPE_OPTIONS.map((o) => o.label).join(" · ")} · Lifecycles: {LIFECYCLE_OPTIONS.length}
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-2 text-xs text-[var(--studio-text-primary)]"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}