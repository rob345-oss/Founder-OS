"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { MarketingSessionInfo } from "@/lib/marketing/client-api";
import { fetchMarketingSessionDeduped } from "@/lib/marketing/session-fetch";

type MarketingSessionContextValue = {
  token: string | null;
  session: MarketingSessionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  supabase: SupabaseClient;
  canUseMarketing: boolean;
};

const MarketingSessionContext = createContext<MarketingSessionContextValue | null>(null);

export function MarketingSessionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<MarketingSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setToken(data.session?.access_token ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setToken(nextSession?.access_token ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    if (!token) {
      setSession({ authorized: false });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const info = await fetchMarketingSessionDeduped(token);
      setSession(info);
      setError(null);
    } catch (e) {
      setSession({ authorized: false });
      setError(e instanceof Error ? e.message : "Session check failed");
    } finally {
      setLoading(false);
    }
  }, [authReady, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    (): MarketingSessionContextValue => ({
      token,
      session,
      loading: !authReady || loading,
      error,
      refresh,
      supabase,
      canUseMarketing: Boolean(session?.authorized),
    }),
    [token, session, authReady, loading, error, refresh, supabase],
  );

  return <MarketingSessionContext.Provider value={value}>{children}</MarketingSessionContext.Provider>;
}

export function useMarketingSession(): MarketingSessionContextValue {
  const ctx = useContext(MarketingSessionContext);
  if (!ctx) {
    throw new Error("useMarketingSession must be used within MarketingSessionProvider");
  }
  return ctx;
}
