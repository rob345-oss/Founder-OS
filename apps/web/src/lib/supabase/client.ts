import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

const LOOPBACK_SUPABASE_URL = "http://127.0.0.1:54321";

function resolveSupabaseBrowserConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return { url, key };

  const hostedBuild = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (hostedBuild) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set on deployed Founder OS builds.",
    );
  }

  return { url: url ?? LOOPBACK_SUPABASE_URL, key: key ?? "public-anon-key" };
}

/** Single browser Supabase client — avoids re-subscribing auth on every React render. */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const { url, key } = resolveSupabaseBrowserConfig();
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
