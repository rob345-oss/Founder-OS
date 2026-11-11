import { STUDIO_PIPELINE_STAGES } from "@founder-os/studio";

const LABELS: Record<(typeof STUDIO_PIPELINE_STAGES)[number], string> = {
  ideas: "Ideas",
  recorded: "Recorded",
  imported: "Imported",
  reviewed: "Reviewed",
  editing: "Editing",
  ready: "Ready",
  published: "Published",
};

export function ContentPipeline({ activeStage = "imported" }: { activeStage?: (typeof STUDIO_PIPELINE_STAGES)[number] }) {
  const activeIndex = STUDIO_PIPELINE_STAGES.indexOf(activeStage);
  return (
    <div className="studio-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--studio-text-primary)]">Production pipeline</h3>
        <span className="text-xs text-[var(--studio-text-tertiary)]">Track · future workflow</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-7">
        {STUDIO_PIPELINE_STAGES.map((stage, index) => {
          const active = index <= activeIndex;
          return (
            <li key={stage} className="relative text-center">
              <div
                className={[
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold",
                  active
                    ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]"
                    : "border-[var(--studio-border)] bg-[var(--studio-bg-3)] text-[var(--studio-text-tertiary)]",
                ].join(" ")}
              >
                {index + 1}
              </div>
              <p className="mt-2 text-[11px] font-medium text-[var(--studio-text-secondary)]">{LABELS[stage]}</p>
              {index < STUDIO_PIPELINE_STAGES.length - 1 ? (
                <span
                  className="absolute left-[calc(50%+20px)] top-[18px] hidden h-px w-[calc(100%-40px)] bg-[var(--studio-border)] sm:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
