"use client";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { SocialMediaLibraryWorkspace } from "@/components/marketing/social/media/SocialMediaLibraryWorkspace";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";

export default function SocialMediaLibraryPage() {
  const { token } = useMarketingSession();

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="Media library"
      description="Upload, organize, and reuse creative assets across social posts."
    >
      <SocialMediaLibraryWorkspace token={token} />
    </MarketingModuleScaffold>
  );
}