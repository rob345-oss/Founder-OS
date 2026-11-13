import type { ReactNode } from "react";

import { MarketingSidebar } from "./MarketingSidebar";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="studio-root flex h-screen min-h-screen overflow-hidden bg-[var(--studio-bg-0)]">
      <MarketingSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
    </div>
  );
}
