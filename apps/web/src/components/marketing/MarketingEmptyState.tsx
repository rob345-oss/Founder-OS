import type { ReactNode } from "react";

export function MarketingEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-bg-2)]/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--studio-text-primary)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--studio-text-secondary)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
