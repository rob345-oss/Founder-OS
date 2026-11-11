import { FeaturePlaceholder } from "@/components/studio/FeaturePlaceholder";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioExportsPage() {
  return (
    <div>
      <StudioHeader title="Exports" subtitle="Rendered outputs for social platforms — render pipeline not connected." />
      <div className="px-8 py-8">
        <FeaturePlaceholder
          title="No export engine yet"
          description="Finished renders, codecs, and publish handoffs will appear here once the timeline editor can render locally or via worker jobs."
          badge="Not implemented"
        />
      </div>
    </div>
  );
}
