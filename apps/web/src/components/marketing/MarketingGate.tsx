"use client";

import type { ReactNode } from "react";

import { useMarketingSession } from "./useMarketingSession";

export function MarketingGate({ children }: { children: ReactNode }) {
  const { loading, session, error, supabase } = useMarketingSession();

  if (loading) {
    return (
      <div className="studio-subtle-grid flex flex-1 flex-col p-4 md:p-6 lg:p-8">
        <p className="sr-only">Verifying super_admin access…</p>
        <div className="mx-auto w-full max-w-[1240px] space-y-6">
          <div className="space-y-3 border-b border-[var(--studio-border)] pb-6">
            <div className="marketing-skeleton h-3 w-32 rounded-md" />
            <div className="marketing-skeleton h-8 w-72 max-w-full rounded-md" />
            <div className="marketing-skeleton h-4 w-96 max-w-full rounded-md" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[104px] rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4"
              >
                <div className="marketing-skeleton h-3 w-20 rounded" />
                <div className="marketing-skeleton mt-3 h-7 w-24 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="marketing-skeleton h-64 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] lg:col-span-2" />
            <div className="marketing-skeleton h-64 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]" />
          </div>
          <p className="text-center text-xs text-[var(--studio-text-tertiary)]">Verifying super_admin access…</p>
        </div>
      </div>
    );
  }

  if (!session?.authorized) {
    return (
      <div className="studio-subtle-grid mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 bg-[var(--studio-bg-0)] p-10">
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
