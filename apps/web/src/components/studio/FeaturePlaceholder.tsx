import type { ReactNode } from "react";

export function FeaturePlaceholder({
  title,
  description,
  badge = "Coming soon",
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <div className="studio-panel flex min-h-[420px] flex-col items-center justify-center px-8 py-16 text-center">
      <span className="rounded-full border border-[var(--studio-border-strong)] bg-[var(--studio-bg-3)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">
        {badge}
      </span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{title}</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--studio-text-secondary)]">{description}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
