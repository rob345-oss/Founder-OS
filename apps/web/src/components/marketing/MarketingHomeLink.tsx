"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMarketingSession } from "@/lib/marketing/client-api";

export function MarketingHomeLink() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const session = await fetchMarketingSession(token);
        setVisible(session.authorized);
      } catch {
        setVisible(false);
      }
    });
  }, []);

  if (!visible) return null;

  return (
    <a
      href="/marketing"
      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
    >
      Marketing Command Center
    </a>
  );
}
