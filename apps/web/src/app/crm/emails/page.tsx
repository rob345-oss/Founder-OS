"use client";

import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmEmails } from "@/lib/crm/client-api";
import type { CrmEmailMessage } from "@/lib/crm/types";

export default function CrmEmailsPage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<CrmEmailMessage[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await fetchCrmEmails(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--studio-text-primary)]">Email history</h1>
      <p className="mb-6 text-sm text-[var(--studio-text-secondary)]">
        CRM stores provider events when ingested. TG waitlist confirmations use SendGrid/SMTP today — webhook ingestion is a staging
        follow-up.
      </p>
      <div className="overflow-hidden rounded-lg border border-[var(--studio-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--studio-bg-2)] text-[11px] uppercase text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-[var(--studio-border)]">
                <td className="px-4 py-2">{m.subject ?? "—"}</td>
                <td className="px-4 py-2 text-[var(--studio-text-secondary)]">{m.toAddress}</td>
                <td className="px-4 py-2">{m.deliveryStatus}</td>
                <td className="px-4 py-2 text-[var(--studio-text-tertiary)]">
                  {m.sentAt ? new Date(m.sentAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="p-6 text-sm text-[var(--studio-text-tertiary)]">No email records in CRM storage yet.</p>}
      </div>
    </div>
  );
}
