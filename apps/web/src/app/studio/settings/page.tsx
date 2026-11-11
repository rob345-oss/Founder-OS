import { FeaturePlaceholder } from "@/components/studio/FeaturePlaceholder";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioSettingsPage() {
  return (
    <div>
      <StudioHeader title="Studio Settings" subtitle="Local data paths, FFmpeg tools, and future sync controls." />
      <div className="space-y-6 px-8 py-8">
        <section className="studio-panel p-6 text-sm text-[var(--studio-text-secondary)]">
          <h2 className="text-sm font-medium text-[var(--studio-text-primary)]">Local data</h2>
          <p className="mt-2">
            Index and thumbnails default to{" "}
            <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">%LOCALAPPDATA%\FounderOS\Studio</code>
            . Override with <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">FOUNDER_OS_STUDIO_DATA_DIR</code>.
          </p>
          <p className="mt-3">
            Optional loopback hardening: set server-only{" "}
            <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">STUDIO_LOCAL_TOKEN</code>. To send it from the
            browser, mirror the same value in{" "}
            <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">NEXT_PUBLIC_STUDIO_LOCAL_TOKEN</code> (visible in JS —
            not a secret). For <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">next start</code>, set{" "}
            <code className="rounded bg-[var(--studio-bg-3)] px-1.5 py-0.5 text-xs">STUDIO_ENABLE_LOCAL_FS=true</code>. Vercel deployments
            always block local FS APIs.
          </p>
        </section>
        <FeaturePlaceholder
          title="Cloud sync & devices"
          description="Opt-in sync, iOS pairing, and workspace sharing will be configured here — not available in this phase."
        />
      </div>
    </div>
  );
}
