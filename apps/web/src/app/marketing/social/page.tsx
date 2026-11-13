"use client";

import Link from "next/link";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";

export default function MarketingSocialPage() {
  return (
    <MarketingModuleScaffold
      eyebrow="Social & content"
      title="Social intelligence"
      description="Track Instagram, TikTok, YouTube, LinkedIn, and Facebook performance via official APIs once OAuth is authorized."
    >
      <MarketingEmptyState
        title="Social platforms not connected"
        description="Reach, engagement, and top posts require per-platform OAuth. We do not fabricate cross-platform reach."
        action={
          <Link href="/marketing/integrations" className="text-sm text-[var(--studio-accent)] hover:underline">
            Review integration status →
          </Link>
        }
      />
    </MarketingModuleScaffold>
  );
}
