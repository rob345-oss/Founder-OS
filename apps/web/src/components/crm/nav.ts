import type { LucideIcon } from "lucide-react";
import { ClipboardList, Columns3, Contact2, LayoutDashboard, ListChecks, Mail, Users } from "lucide-react";

export type CrmNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const CRM_NAV: CrmNavItem[] = [
  { href: "/crm", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/crm/contacts", label: "Contacts", icon: Users },
  { href: "/crm/waitlist", label: "Waitlist", icon: ListChecks },
  { href: "/crm/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/crm/follow-ups", label: "Follow-ups", icon: ClipboardList },
  { href: "/crm/emails", label: "Emails", icon: Mail },
];
