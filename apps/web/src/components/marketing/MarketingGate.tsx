"use client";

import type { ReactNode } from "react";

import { TgSuperAdminAccessPanel } from "@/components/tg/TgSuperAdminAccessPanel";

import { useMarketingSession } from "./useMarketingSession";

const MARKETING_LOADING = (
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

export function MarketingGate({ children }: { children: ReactNode }) {
  const { loading, session, error, refresh, hasBearer } = useMarketingSession();

  if (session?.authorized) {
    return <>{children}</>;
  }

  return (
    <TgSuperAdminAccessPanel
      productName="Marketing Command Center"
      returnPath="/marketing"
      loading={loading}
      authorized={Boolean(session?.authorized)}
      hasBearer={hasBearer}
      email={session?.email}
      error={error}
      onRetry={refresh}
      loadingSkeleton={MARKETING_LOADING}
    />
  );
}