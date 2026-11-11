"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function StudioHeader({
  title,
  subtitle,
  workspace = "Personal workspace",
  actions,
  onSearch,
  searchPlaceholder = "Search media, projects, and ideas…",
}: {
  title: string;
  subtitle?: string;
  workspace?: string;
  actions?: ReactNode;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
}) {
  return (
    <header className="shrink-0 border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)]/80 px-6 py-6 backdrop-blur-sm lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">
            {workspace}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-[var(--studio-text-secondary)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onSearch ? (
        <label className="relative mt-5 block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--studio-text-tertiary)]" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="w-full rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--studio-text-primary)] placeholder:text-[var(--studio-text-tertiary)]"
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      ) : null}
    </header>
  );
}
