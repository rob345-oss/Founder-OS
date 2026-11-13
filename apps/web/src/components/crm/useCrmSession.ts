"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm/client-api";

export function useCrmSession() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
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
      const info = await fetchCrmSession(token);
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

  return { token, session, loading, error, refresh, supabase, canUseCrm: Boolean(session?.authorized) };
}
