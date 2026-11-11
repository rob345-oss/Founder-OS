import { ContentPipeline } from "@/components/studio/ContentPipeline";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioPipelinePage() {
  return (
    <div>
      <StudioHeader
        title="Content Pipeline"
        subtitle="Track ideas through publish — workflow automation connects in a future phase."
      />
      <div className="px-8 py-8">
        <ContentPipeline activeStage="imported" />
      </div>
    </div>
  );
}
