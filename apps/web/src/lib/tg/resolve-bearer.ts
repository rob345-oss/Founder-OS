import { createClient } from "@/lib/supabase/client";

import { getStoredTgAccessToken } from "./browser-tokens";

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

function allowSupabaseDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && supabaseConfigured();
}

/** Prefer TG browser JWT; optional Supabase session in local dev only. */
export async function resolveActiveBearerToken(): Promise<string | null> {
  const tgToken = getStoredTgAccessToken();
  if (tgToken) return tgToken;

  if (allowSupabaseDevFallback()) {
    try {
      const { data } = await createClient().auth.getSession();
      return data.session?.access_token?.trim() ?? null;
    } catch {
      return null;
    }
  }

  return null;
}