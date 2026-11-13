"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { CrmSessionInfo } from "@/lib/crm/client-api";
import { fetchCrmSessionDeduped, logCrmSessionDiag } from "@/lib/crm/session-fetch";

type CrmSessionContextValue = {
  token: string | null;
  session: CrmSessionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  supabase: SupabaseClient;
  canUseCrm: boolean;
};

const CrmSessionContext = createContext<CrmSessionContextValue | null>(null);

export function CrmSessionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
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
    const started = performance.now();
    try {
      const info = await fetchCrmSessionDeduped(token);
      setSession(info);
      setError(null);
      logCrmSessionDiag(performance.now() - started, info.authorized ? "authorized" : "denied");
    } catch (e) {
      setSession({ authorized: false });
      const message = e instanceof Error ? e.message : "Session check failed";
      setError(message);
      logCrmSessionDiag(performance.now() - started, "error");
    } finally {
      setLoading(false);
    }
  }, [authReady, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    (): CrmSessionContextValue => ({
      token,
      session,
      loading: !authReady || loading,
      error,
      refresh,
      supabase,
      canUseCrm: Boolean(session?.authorized),
    }),
    [token, session, authReady, loading, error, refresh, supabase],
  );

  return <CrmSessionContext.Provider value={value}>{children}</CrmSessionContext.Provider>;
}

export function useCrmSession(): CrmSessionContextValue {
  const ctx = useContext(CrmSessionContext);
  if (!ctx) {
    throw new Error("useCrmSession must be used within CrmSessionProvider");
  }
  return ctx;
}
