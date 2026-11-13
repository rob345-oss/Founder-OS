"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmContacts, syncCrmWaitlist } from "@/lib/crm/client-api";
import type { CrmContactListItem } from "@/lib/crm/types";

export default function CrmWaitlistPage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<CrmContactListItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await fetchCrmContacts(token, {
      classification: "waitlist_candidate",
      limit: 200,
      sort: "date_added",
      direction: "desc",
    });
    setItems(data.items);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSync() {
    if (!token) return;
    setSyncing(true);
    try {
      await syncCrmWaitlist(token);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <WaitlistHeader />
        <button
          type="button"
          onClick={() => void onSync()}
          disabled={syncing}
          className="rounded-lg border border-[var(--studio-border)] px-4 py-2 text-sm disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Reconcile from TG leads"}
        </button>
      </header>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3">
            <Link href={`/crm/contacts/${c.id}`} className="font-medium text-[var(--studio-text-primary)] hover:underline">
              {c.fullName || c.primaryEmail}
            </Link>
            <p className="text-xs text-[var(--studio-text-tertiary)]">
              Added {new Date(c.dateAdded).toLocaleDateString()} · {c.contactSource ?? "waitlist"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WaitlistHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--studio-text-primary)]">Waitlist</h1>
      <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">
        Materialized from authoritative <code className="text-xs">/v1/analytics/leads</code> records.
      </p>
    </div>
  );
}
