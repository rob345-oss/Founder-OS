"use client";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";

export default function SocialMediaLibraryPage() {
  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="Media library"
      description="Centralized creative assets with Studio cross-links. Upload pipeline and Blob storage land in M2."
    >
      <MarketingEmptyState
        title="No media assets yet"
        description="Attach media references when creating posts. Full library management connects to Studio exports next."
      />
    </MarketingModuleScaffold>
  );
}