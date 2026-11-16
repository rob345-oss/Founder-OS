import type { ReactNode } from "react";

export function MarketingModuleScaffold({
  eyebrow,
  title,
  description,
  children,
  layout = "default",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  layout?: "default" | "fluid";
}) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 pb-12 pt-6 md:px-6 md:pt-8",
        layout === "fluid" ? "max-w-[1600px]" : "max-w-6xl",
      ].join(" ")}
    >
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-text-tertiary)]">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--studio-text-secondary)]">{description}</p>
      </header>
      {children}
    </div>
  );
}
