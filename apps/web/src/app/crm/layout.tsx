import type { ReactNode } from "react";
import type { Metadata } from "next";

import { CrmGate } from "@/components/crm/CrmGate";
import { CrmShell } from "@/components/crm/CrmShell";

export const metadata: Metadata = {
  title: "CRM — Titanium Guardian",
  description: "Private customer relationship management for Titanium Guardian",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <CrmShell>
      <CrmGate>{children}</CrmGate>
    </CrmShell>
  );
}
