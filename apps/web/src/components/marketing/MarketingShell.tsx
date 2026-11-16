import type { ReactNode } from "react";

import { MarketingSidebar } from "./MarketingSidebar";
import { MarketingTopBar } from "./MarketingTopBar";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="studio-root marketing-command-center flex h-screen min-h-screen overflow-hidden bg-[var(--studio-bg-0)]">
      <MarketingSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <MarketingTopBar />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
