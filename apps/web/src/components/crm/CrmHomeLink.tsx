"use client";

import { useEffect, useState } from "react";

import { fetchCrmSession } from "@/lib/crm/client-api";
import { getStoredTgAccessToken } from "@/lib/tg/browser-tokens";

export function CrmHomeLink() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = getStoredTgAccessToken();
    if (!token) return;
    void fetchCrmSession(token)
      .then((session) => setVisible(session.authorized))
      .catch(() => setVisible(false));
  }, []);

  if (!visible) return null;

  return (
    <a
      href="/crm"
      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
    >
      Titanium Guardian CRM
    </a>
  );
}