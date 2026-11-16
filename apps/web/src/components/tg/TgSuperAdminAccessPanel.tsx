"use client";

import type { ReactNode } from "react";

import { crmBtnPrimary, crmBtnSecondary } from "@/components/crm/crmUi";
import { classifySuperAdminAccess } from "@/lib/tg/access-denial";
import { navigateToTgLogin } from "@/lib/tg/login-url";

export type TgSuperAdminAccessPanelProps = {
  productName: string;
  returnPath: string;
  loading: boolean;
  authorized: boolean;
  hasBearer: boolean;
  email?: string | null;
  error: string | null;
  onRetry: () => void;
  loadingSkeleton?: ReactNode;
};

const DEFAULT_SKELETON = (
  <div className="flex flex-1 items-center justify-center p-12">
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--studio-border)] border-t-[var(--studio-text-secondary)]"
        role="status"
        aria-label="Verifying access"
      />
      <p className="text-sm text-[var(--studio-text-secondary)]">Verifying super_admin access…</p>
    </div>
  </div>
);

export function TgSuperAdminAccessPanel({
  productName,
  returnPath,
  loading,
  authorized,
  hasBearer,
  email,
  error,
  onRetry,
  loadingSkeleton,
}: TgSuperAdminAccessPanelProps) {
  const phase = classifySuperAdminAccess({ loading, hasBearer, authorized, error });

  if (phase === "loading") {
    return <>{loadingSkeleton ?? DEFAULT_SKELETON}</>;
  }

  if (phase === "authorized") {
    return null;
  }

  const showSignIn = phase === "unauthenticated" || (phase === "transient" && !hasBearer);

  return (
    <div className="studio-subtle-grid relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-6 p-8 md:p-10">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--studio-border)] bg-gradient-to-br from-[var(--studio-bg-2)] to-[var(--studio-bg-0)] text-sm font-bold text-[var(--studio-text-primary)] shadow-sm"
        >
          TG
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-text-tertiary)]">
            Titanium Guardian
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{productName}</h1>
        </div>
      </div>

      {phase === "forbidden" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-[var(--studio-text-primary)]">Access denied</h2>
          <p className="text-sm leading-relaxed text-[var(--studio-text-secondary)]">
            {email ? (
              <>
                Signed in as <span className="font-medium text-[var(--studio-text-primary)]">{email}</span>, but this
                area requires the backend <code className="text-[var(--studio-text-primary)]">super_admin</code> role.
              </>
            ) : (
              <>
                Your Titanium Guardian account is signed in but does not have the backend{" "}
                <code className="text-[var(--studio-text-primary)]">super_admin</code> role.
              </>
            )}
          </p>
        </div>
      ) : phase === "transient" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-[var(--studio-text-primary)]">Could not verify access</h2>
          <p className="text-sm leading-relaxed text-[var(--studio-text-secondary)]">
            The authorization service did not respond in time. Your existing session was not cleared.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-[var(--studio-text-primary)]">Sign in required</h2>
          <p className="text-sm leading-relaxed text-[var(--studio-text-secondary)]">
            {productName} uses your existing Titanium Guardian session. Sign in with Google on the main app, then you
            will return here automatically.
          </p>
        </div>
      )}

      {error ? (
        <p
          className="rounded-xl border border-red-900/50 bg-red-950/25 p-3 text-xs leading-relaxed text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {showSignIn ? (
          <button type="button" className={crmBtnPrimary} onClick={() => navigateToTgLogin(returnPath)}>
            Sign in with Titanium Guardian
          </button>
        ) : null}
        {phase === "transient" || error ? (
          <button type="button" className={crmBtnSecondary} onClick={() => void onRetry()}>
            Retry verification
          </button>
        ) : null}
      </div>
    </div>
  );
}