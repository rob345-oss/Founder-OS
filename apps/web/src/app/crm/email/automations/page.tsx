"use client";

export default function EmailAutomationsPage() {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-dashed border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-8 text-center">
      <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Automation builder</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--studio-text-secondary)]">
        Database scaffolding for multi-step sequences is in place. Manual campaign flows should be validated on staging before activating
        waitlist onboarding automations against real customers.
      </p>
      <p className="mt-4 text-xs text-[var(--studio-text-tertiary)]">Status: draft-only — requires explicit approval to activate.</p>
    </div>
  );
}