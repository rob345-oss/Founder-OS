"use client";

import type { ReactNode } from "react";

import { useMarketingSession } from "./useMarketingSession";

export function MarketingGate({ children }: { children: ReactNode }) {
  const { loading, session, error, supabase } = useMarketingSession();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-sm text-[var(--studio-text-secondary)]">
        Verifying super_admin access…
      </div>
    );
  }

  if (!session?.authorized) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 p-10">
        <h1 className="text-xl font-semibold text-[var(--studio-text-primary)]">Marketing Command Center restricted</h1>
        <p className="text-sm leading-relaxed text-[var(--studio-text-secondary)]">
          This area contains privileged growth and contact intelligence. Sign in with a Titanium Guardian account that
          has the backend <code className="text-[var(--studio-text-primary)]">super_admin</code> role.
        </p>
        {error ? (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-200">{error}</p>
        ) : null}
        <button
          type="button"
          className="w-fit rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-hover)]"
          onClick={() => void supabase.auth.signInWithOAuth({ provider: "google" })}
        >
          Sign in
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
