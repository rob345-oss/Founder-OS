"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { ContactEditorModal } from "@/components/crm/contacts/ContactEditorModal";
import { crmBtnPrimary } from "@/components/crm/crmUi";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmContacts } from "@/lib/crm/client-api";
import type { CrmContact, CrmContactListItem } from "@/lib/crm/types";

export default function CrmContactsPage() {
  const router = useRouter();
  const { token } = useCrmSession();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CrmContactListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

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

  function onCreated(contact: CrmContact) {
    router.push(`/crm/contacts/${contact.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">Contacts</h1>
          <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{total} total</p>
        </div>
        <button type="button" onClick={() => setEditorOpen(true)} className={`${crmBtnPrimary} gap-2`}>
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Add contact
        </button>
      </header>

      <div className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, organization"
          className="w-full max-w-md rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-2.5 text-sm text-[var(--studio-text-primary)] shadow-sm"
        />
      </div>

      <ContactEditorModal
        open={editorOpen}
        mode="create"
        token={token}
        onClose={() => setEditorOpen(false)}
        onSaved={onCreated}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)] text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Stage</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-[var(--studio-border)]/60 transition-colors hover:bg-[var(--studio-bg-hover)]">
                <td className="px-4 py-3">
                  <Link href={`/crm/contacts/${c.id}`} className="font-medium text-[var(--studio-text-primary)] hover:text-[var(--studio-accent)]">
                    {c.fullName || "—"}
                  </Link>
                  <p className="sm:hidden text-xs text-[var(--studio-text-tertiary)]">{c.primaryEmail}</p>
                </td>
                <td className="hidden px-4 py-3 text-[var(--studio-text-secondary)] sm:table-cell">{c.primaryEmail}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{c.relationshipStatus.replaceAll("_", " ")}</td>
                <td className="hidden px-4 py-3 text-[var(--studio-text-secondary)] md:table-cell">{c.pipelineStage.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="p-8 text-center text-sm text-[var(--studio-text-tertiary)]">No contacts found.</p>
        )}
      </div>
    </div>
  );
}