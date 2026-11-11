import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--studio-radius-lg)] border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-bg-1)] px-8 py-16 text-center">
      <p className="text-base font-medium text-[var(--studio-text-primary)]">{title}</p>
      <p className="mt-2 max-w-md text-sm text-[var(--studio-text-secondary)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
      {!action && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
