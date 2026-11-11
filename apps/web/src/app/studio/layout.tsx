import type { ReactNode } from "react";

import { StudioShell } from "@/components/studio/StudioShell";

export const metadata = {
  title: "Founder OS Studio",
  description: "Premium local-first video production for founders",
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
