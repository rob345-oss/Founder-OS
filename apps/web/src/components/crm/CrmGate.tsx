"use client";

import type { ReactNode } from "react";

import { TgSuperAdminAccessPanel } from "@/components/tg/TgSuperAdminAccessPanel";

import { useCrmSession } from "./useCrmSession";

export function CrmGate({ children }: { children: ReactNode }) {
  const { loading, session, error, refresh, hasBearer } = useCrmSession();

  if (session?.authorized) {
    return <>{children}</>;
  }

  return (
    <TgSuperAdminAccessPanel
      productName="CRM"
      returnPath="/crm"
      loading={loading}
      authorized={Boolean(session?.authorized)}
      hasBearer={hasBearer}
      email={session?.email}
      error={error}
      onRetry={refresh}
    />
  );
}