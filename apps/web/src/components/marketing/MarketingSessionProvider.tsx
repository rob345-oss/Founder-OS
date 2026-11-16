"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { MarketingSessionInfo } from "@/lib/marketing/client-api";
import { fetchMarketingSessionDeduped } from "@/lib/marketing/session-fetch";
import { resolveActiveBearerToken } from "@/lib/tg/resolve-bearer";
import { useTgBearerAuth } from "@/lib/tg/use-tg-bearer-auth";

type MarketingSessionContextValue = {
  token: string | null;
  session: MarketingSessionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasBearer: boolean;
  canUseMarketing: boolean;
};

const MarketingSessionContext = createContext<MarketingSessionContextValue | null>(null);

export function MarketingSessionProvider({ children }: { children: ReactNode }) {
  const { token, authReady } = useTgBearerAuth();
  const [session, setSession] = useState<MarketingSessionInfo | null>(null);
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
    try {
      const info = await fetchMarketingSessionDeduped(bearer);
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
      hasBearer: Boolean(token),
      canUseMarketing: Boolean(session?.authorized),
    }),
    [token, session, authReady, loading, error, refresh],
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