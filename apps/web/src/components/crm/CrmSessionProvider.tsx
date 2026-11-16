"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { CrmSessionInfo } from "@/lib/crm/client-api";
import { fetchCrmSessionDeduped, logCrmSessionDiag } from "@/lib/crm/session-fetch";
import { resolveActiveBearerToken } from "@/lib/tg/resolve-bearer";
import { useTgBearerAuth } from "@/lib/tg/use-tg-bearer-auth";

type CrmSessionContextValue = {
  token: string | null;
  session: CrmSessionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasBearer: boolean;
  canUseCrm: boolean;
};

const CrmSessionContext = createContext<CrmSessionContextValue | null>(null);

export function CrmSessionProvider({ children }: { children: ReactNode }) {
  const { token, authReady } = useTgBearerAuth();
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    const bearer = await resolveActiveBearerToken();
    if (!bearer) {
      setSession({ authorized: false });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const started = performance.now();
    try {
      const info = await fetchCrmSessionDeduped(bearer);
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
      hasBearer: Boolean(token),
      canUseCrm: Boolean(session?.authorized),
    }),
    [token, session, authReady, loading, error, refresh],
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