"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailCalendar } from "@/lib/crm/email-client-api";

export default function EmailCalendarPage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<Array<{ id: string; name: string; status: string; scheduledAt: string | null }>>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await fetchEmailCalendar(token);
    setItems(data.items);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.id} className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3 text-sm">
          <Link href={`/crm/email/campaigns/${c.id}`} className="font-medium hover:underline">
            {c.name}
          </Link>
          <p className="text-xs text-[var(--studio-text-tertiary)]">
            {c.status} · {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "No schedule"}
          </p>
        </li>
      ))}
      {!items.length && <li className="text-sm text-[var(--studio-text-tertiary)]">No scheduled campaigns.</li>}
    </ul>
  );
}