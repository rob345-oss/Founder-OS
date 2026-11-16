"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { getStoredTgAccessToken, subscribeTgTokenStorage } from "./browser-tokens";

export type TgBearerSource = "titanium-guardian" | "supabase-dev" | null;

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

function allowSupabaseDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && supabaseConfigured();
}

export type TgBearerAuthState = {
  token: string | null;
  authReady: boolean;
  bearerSource: TgBearerSource;
  resync: () => void;
};

export function useTgBearerAuth(): TgBearerAuthState {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bearerSource, setBearerSource] = useState<TgBearerSource>(null);

  const resync = useCallback(() => {
    const tgToken = getStoredTgAccessToken();
    if (tgToken) {
      setToken(tgToken);
      setBearerSource("titanium-guardian");
      setAuthReady(true);
      return;
    }

    if (allowSupabaseDevFallback()) {
      void createClient()
        .auth.getSession()
        .then(({ data }) => {
          const devToken = data.session?.access_token?.trim() ?? null;
          setToken(devToken);
          setBearerSource(devToken ? "supabase-dev" : null);
          setAuthReady(true);
        })
        .catch(() => {
          setToken(null);
          setBearerSource(null);
          setAuthReady(true);
        });
      return;
    }

    setToken(null);
    setBearerSource(null);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    resync();

    const unsubStorage = subscribeTgTokenStorage(() => resync());

    const onFocus = () => resync();
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVis);

    let unsubscribeAuth: (() => void) | undefined;
    if (allowSupabaseDevFallback()) {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => resync());
      unsubscribeAuth = () => subscription.unsubscribe();
    }

    return () => {
      unsubStorage();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      unsubscribeAuth?.();
    };
  }, [resync]);

  return { token, authReady, bearerSource, resync };
}