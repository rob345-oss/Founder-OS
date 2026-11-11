import { AIStudio } from "@/components/studio/AIStudio";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioAIPage() {
  return (
    <>
      <StudioHeader title="AI Studio" subtitle="Production intelligence interfaces — models not connected in this phase." />
      <AIStudio />
    </>
  );
}
