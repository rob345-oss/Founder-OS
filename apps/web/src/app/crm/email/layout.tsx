import type { ReactNode } from "react";

import { EmailSubNav } from "@/components/crm/email/EmailSubNav";

export default function CrmEmailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <header className="mb-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-text-tertiary)]">Titanium Guardian</p>
        <h1 className="text-2xl font-semibold text-[var(--studio-text-primary)]">Email</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--studio-text-secondary)]">
          Design thoughtful messages, reach the right people, and understand engagement — built for long-term relationships.
        </p>
      </header>
      <EmailSubNav />
      {children}
    </div>
  );
}