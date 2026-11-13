"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LineChart, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { LucideIcon } from "lucide-react";

import { MARKETING_NAV } from "./nav";

const COLLAPSE_KEY = "marketing-sidebar-collapsed";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const sidebar = (
    <aside
      className={[
        "flex h-screen shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-bg-1)] transition-[width]",
        collapsed ? "w-[72px]" : "w-[var(--studio-sidebar-width)]",
      ].join(" ")}
      aria-label="Marketing navigation"
    >
      <div className="border-b border-[var(--studio-border)] px-4 py-5">
        <Link
          href="/"
          className={[
            "mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--studio-text-tertiary)] transition-colors hover:text-[var(--studio-text-secondary)]",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {!collapsed ? <span>Founder OS</span> : null}
        </Link>
        <div className={["flex items-center gap-2", collapsed ? "justify-center" : ""].join(" ")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border-strong)] bg-gradient-to-br from-[rgba(91,140,255,0.25)] to-[rgba(120,90,255,0.12)] text-[var(--studio-accent)]">
            <LineChart className="h-4 w-4" aria-hidden />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-text-tertiary)]">
                Titanium Guardian
              </p>
              <p className="truncate text-sm font-semibold text-[var(--studio-text-primary)]">Marketing Command Center</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {MARKETING_NAV.map((section) => (
          <div key={section.title}>
            {!collapsed ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">
                {section.title}
              </p>
            ) : null}
            <NavItems pathname={pathname} collapsed={collapsed} items={section.items} />
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[var(--studio-border)] p-3">
        {!collapsed ? (
          <Link
            href="/crm"
            className="block rounded-[var(--studio-radius-md)] px-3 py-2 text-xs text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] hover:text-[var(--studio-text-primary)]"
          >
            ← Titanium Guardian admin (CRM)
          </Link>
        ) : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-2 text-xs text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] text-[var(--studio-text-primary)] md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open marketing navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-20 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-2"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation drawer"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavItems({
  pathname,
  collapsed,
  items,
}: {
  pathname: string;
  collapsed: boolean;
  items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[];
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={[
              "group flex items-center gap-3 rounded-[var(--studio-radius-md)] px-3 py-2.5 text-sm transition-[background,color,box-shadow]",
              active
                ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)] shadow-[inset_0_0_0_1px_rgba(91,140,255,0.25)]"
                : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] hover:text-[var(--studio-text-primary)]",
              collapsed ? "justify-center px-2" : "",
            ].join(" ")}
          >
            <Icon
              className={[
                "h-4 w-4 shrink-0",
                active ? "text-[var(--studio-accent)]" : "text-[var(--studio-text-tertiary)] group-hover:text-[var(--studio-text-secondary)]",
              ].join(" ")}
              aria-hidden
            />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
