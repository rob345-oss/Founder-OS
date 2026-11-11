import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--studio-radius-lg)] border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-bg-1)] px-8 py-16 text-center">
      <p className="text-base font-medium text-[var(--studio-text-primary)]">{title}</p>
      <p className="mt-2 max-w-md text-sm text-[var(--studio-text-secondary)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
