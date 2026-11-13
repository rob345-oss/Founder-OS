"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMarketingSession, type MarketingSessionInfo } from "@/lib/marketing/client-api";

export function useMarketingSession() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<MarketingSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const refresh = useCallback(async () => {
    if (!token) {
      setSession({ authorized: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const info = await fetchMarketingSession(token);
      setSession(info);
      setError(null);
    } catch (e) {
      setSession({ authorized: false });
      setError(e instanceof Error ? e.message : "Session check failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { token, session, loading, error, refresh, supabase, canUseMarketing: Boolean(session?.authorized) };
}
