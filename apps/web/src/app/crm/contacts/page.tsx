"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { createCrmContact, fetchCrmContacts } from "@/lib/crm/client-api";
import type { CrmContactListItem } from "@/lib/crm/types";

export default function CrmContactsPage() {
  const { token } = useCrmSession();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CrmContactListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: "", primaryEmail: "" });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchCrmContacts(token, { q, limit: 100, sort: "last_interaction", direction: "desc" });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [token, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await createCrmContact(token, { fullName: form.fullName, primaryEmail: form.primaryEmail });
    setShowCreate(false);
    setForm({ fullName: "", primaryEmail: "" });
    await load();
  }

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

      <div className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, organization"
          className="w-full max-w-md rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2 text-sm text-[var(--studio-text-primary)]"
        />
      </div>

      {showCreate && (
        <form onSubmit={(e) => void onCreate(e)} className="mb-6 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <input
              required
              type="email"
              className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              placeholder="Email"
              value={form.primaryEmail}
              onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
            />
          </div>
          <MotionButtons onCancel={() => setShowCreate(false)} />
        </form>
      )}

      <div className="overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)] text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Stage</th>
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
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.relationshipStatus.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.pipelineStage.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="p-6 text-sm text-[var(--studio-text-tertiary)]">No contacts found.</p>
        )}
      </div>
    </div>
  );
}

function MotionButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <button type="submit" className="rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-xs font-medium text-white">
        Save
      </button>
      <button type="button" onClick={onCancel} className="rounded-md border border-[var(--studio-border)] px-3 py-1.5 text-xs">
        Cancel
      </button>
    </div>
  );
}
