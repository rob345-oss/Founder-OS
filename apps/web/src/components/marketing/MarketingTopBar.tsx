"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { MARKETING_NAV } from "./nav";

function resolveTitle(pathname: string): string {
  for (const section of MARKETING_NAV) {
    for (const item of section.items) {
      if (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return item.label;
      }
    }
  }
  return "Overview";
}

export function MarketingTopBar() {
  const pathname = usePathname() ?? "/marketing";
  const title = resolveTitle(pathname);
  const showCreate = pathname.startsWith("/marketing/social") && !pathname.includes("/create");

  return (
    <header className="sticky top-0 z-30 hidden shrink-0 border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)]/92 backdrop-blur-sm md:flex">
      <div className="flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">
            Titanium Guardian · Founder OS
          </p>
          <h2 className="truncate text-sm font-semibold text-[var(--studio-text-primary)]">{title}</h2>
        </div>
        {showCreate ? (
          <Link
            href="/marketing/social/create"
            className="rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            Create post
          </Link>
        ) : null}
      </div>
    </header>
  );
}