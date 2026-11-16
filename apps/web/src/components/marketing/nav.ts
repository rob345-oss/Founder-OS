import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  Image,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Megaphone,
  PenLine,
  Plug,
  Rows3,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

export type MarketingNavSection = {
  title: string;
  items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[];
};

/** Social publishing command center + shared marketing modules. */
export const MARKETING_NAV: MarketingNavSection[] = [
  {
    title: "Social command center",
    items: [
      { href: "/marketing/social", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/marketing/social/calendar", label: "Content calendar", icon: Calendar },
      { href: "/marketing/social/posts", label: "All posts", icon: Rows3 },
      { href: "/marketing/social/create", label: "Create post", icon: PenLine },
      { href: "/marketing/social/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/marketing/audience", label: "Audience", icon: Users },
      { href: "/marketing/social/insights", label: "AI insights", icon: Lightbulb },
      { href: "/marketing/social/media", label: "Media library", icon: Image },
      { href: "/marketing/integrations", label: "Connected accounts", icon: Plug },
      { href: "/marketing/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Executive marketing",
    items: [
      { href: "/marketing", label: "Growth dashboard", icon: Sparkles, exact: true },
      { href: "/marketing/growth", label: "Conversions", icon: Link2 },
    ],
  },
];