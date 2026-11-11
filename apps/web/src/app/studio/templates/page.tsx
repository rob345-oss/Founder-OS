import { FeaturePlaceholder } from "@/components/studio/FeaturePlaceholder";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioTemplatesPage() {
  return (
    <div>
      <StudioHeader title="Templates" subtitle="Platform-specific formats and branded assemblies." />
      <div className="px-8 py-8">
        <FeaturePlaceholder
          title="Template library"
          description="Reusable Reels, Shorts, and LinkedIn layouts with hook/body/CTA slots will ship after the editor timeline connects to export presets."
        />
      </div>
    </div>
  );
}
