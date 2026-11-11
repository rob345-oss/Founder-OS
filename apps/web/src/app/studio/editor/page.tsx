import { Suspense } from "react";

import { EditorWorkspace } from "@/components/studio/EditorWorkspace";

export default function StudioEditorPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<p className="p-6 text-sm text-[var(--studio-text-tertiary)]">Loading editor…</p>}>
        <EditorWorkspace />
      </Suspense>
    </div>
  );
}
