import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Calendar,
  Flag,
  LayoutDashboard,
  LineChart,
  Megaphone,
  PenLine,
  PieChart,
  Plug,
  Settings,
  Share2,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export type MarketingNavSection = {
  title: string;
  items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[];
};

export const MARKETING_NAV: MarketingNavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/marketing", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/marketing/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Social & content",
    items: [
      { href: "/marketing/social", label: "Social Intelligence", icon: Share2 },
      { href: "/marketing/content", label: "Content Studio", icon: PenLine },
      { href: "/marketing/calendar", label: "Content Calendar", icon: Calendar },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/marketing/growth", label: "Growth & Conversions", icon: TrendingUp },
      { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/marketing/audience", label: "Audience Insights", icon: Users },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/marketing/activity", label: "Marketing Activity", icon: Activity },
      { href: "/marketing/goals", label: "Goals & Targets", icon: Flag },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/marketing/integrations", label: "Integrations", icon: Plug },
      { href: "/marketing/settings", label: "Settings", icon: Settings },
    ],
  },
];
