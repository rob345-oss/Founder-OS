import type { ReactNode } from "react";
import type { Metadata } from "next";

import { MarketingGate } from "@/components/marketing/MarketingGate";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Marketing Command Center — Titanium Guardian",
  description: "Founder marketing intelligence and operations",
  robots: { index: false, follow: false },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      <MarketingGate>{children}</MarketingGate>
    </MarketingShell>
  );
}
