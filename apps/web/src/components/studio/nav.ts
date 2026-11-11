import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Clapperboard,
  Download,
  FolderKanban,
  LayoutDashboard,
  Library,
  Route,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react";

export type StudioNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const STUDIO_NAV: StudioNavItem[] = [
  { href: "/studio", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/studio/media", label: "Media Library", icon: Library },
  { href: "/studio/editor", label: "Video Editor", icon: Clapperboard },
  { href: "/studio/projects", label: "Projects", icon: FolderKanban },
  { href: "/studio/ai", label: "AI Studio", icon: Sparkles },
  { href: "/studio/pipeline", label: "Content Pipeline", icon: Route },
  { href: "/studio/templates", label: "Templates", icon: Wand2 },
  { href: "/studio/exports", label: "Exports", icon: Download },
  { href: "/studio/settings", label: "Settings", icon: Settings },
];

export const STUDIO_AI_FEATURES = [
  { title: "AI Assembly", description: "Assemble hooks, bodies, CTAs, and B-roll into platform-ready edits.", icon: Bot },
  { title: "Smart Clip Finder", description: "Semantic search across your footage library and transcripts.", icon: Sparkles },
  { title: "Transcript Intelligence", description: "Navigate spoken content at the word level inside Studio.", icon: Library },
  { title: "Content Repurposing", description: "Multiply output from reusable modular segments.", icon: Wand2 },
] as const;
