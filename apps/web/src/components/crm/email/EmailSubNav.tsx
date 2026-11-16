"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Mail,
  Megaphone,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

const ITEMS = [
  { href: "/crm/email", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/crm/email/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/crm/email/templates", label: "Templates", icon: Mail },
  { href: "/crm/email/automations", label: "Automations", icon: Sparkles },
  { href: "/crm/email/audience", label: "Audience", icon: Users },
  { href: "/crm/email/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/crm/email/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/crm/email/settings", label: "Settings", icon: Settings2 },
];

export function EmailSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-1.5"
      aria-label="Email workspace"
    >
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)] shadow-[inset_0_0_0_1px_rgba(91,140,255,0.2)]"
                : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] hover:text-[var(--studio-text-primary)]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}