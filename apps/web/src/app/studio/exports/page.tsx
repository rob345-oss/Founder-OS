import { ExportsHistory } from "@/components/studio/ExportsHistory";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioExportsPage() {
  return (
    <div>
      <StudioHeader title="Exports" subtitle="Local FFmpeg renders — H.264 MP4 for social delivery." />
      <ExportsHistory />
    </div>
  );
}
