"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Contact2 } from "lucide-react";

import { CRM_NAV } from "./nav";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CrmSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-[var(--studio-sidebar-width)] shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-bg-1)]"
      aria-label="CRM navigation"
    >
      <div className="border-b border-[var(--studio-border)] px-5 py-5">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--studio-text-tertiary)] transition-colors hover:text-[var(--studio-text-secondary)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Founder OS
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border-strong)] bg-[var(--studio-bg-3)] text-[var(--studio-accent)]">
            <Contact2 className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-text-tertiary)]">
              Titanium Guardian
            </p>
            <p className="text-sm font-semibold text-[var(--studio-text-primary)]">CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {CRM_NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-3 rounded-[var(--studio-radius-md)] px-3 py-2.5 text-sm transition-[background,color,box-shadow]",
                active
                  ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)] shadow-[inset_0_0_0_1px_rgba(91,140,255,0.25)]"
                  : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] hover:text-[var(--studio-text-primary)]",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 shrink-0",
                  active ? "text-[var(--studio-accent)]" : "text-[var(--studio-text-tertiary)] group-hover:text-[var(--studio-text-secondary)]",
                ].join(" ")}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--studio-border)] p-4">
        <Link
          href="/marketing"
          className="mb-3 block rounded-[var(--studio-radius-md)] px-2 py-2 text-xs text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] hover:text-[var(--studio-text-primary)]"
        >
          Marketing Command Center →
        </Link>
        <p className="text-[11px] leading-relaxed text-[var(--studio-text-tertiary)]">
          Private CRM — super_admin only. Server verifies Titanium Guardian RBAC on every API call.
        </p>
      </div>
    </aside>
  );
}
