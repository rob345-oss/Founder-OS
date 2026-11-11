export function TimelineShell({ demo = false }: { demo?: boolean }) {
  const clips = demo
    ? [
        { id: "1", label: "Hook — scam callback", width: "14%" },
        { id: "2", label: "Body — explain red flags", width: "38%" },
        { id: "3", label: "B-roll — phone lock", width: "18%" },
        { id: "4", label: "CTA — share with family", width: "22%" },
      ]
    : [];

  return (
    <div className="flex h-56 flex-col border-t border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-2">
        <div className="flex items-center gap-3 text-xs text-[var(--studio-text-tertiary)]">
          <span>Timeline</span>
          <span className="text-[var(--studio-text-secondary)]">00:00:00:00</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--studio-text-tertiary)]">
          <span>Zoom</span>
          <input type="range" min={0} max={100} defaultValue={40} className="w-24" disabled={!demo} />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-3">
        {["Video", "Audio", "Captions"].map((track) => (
          <div key={track} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">
              {track}
            </span>
            <div className="relative h-10 flex-1 rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] bg-[var(--studio-bg-0)]">
              {track === "Video" && clips.length > 0 ? (
                <div className="absolute inset-y-1 left-2 flex gap-1">
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      style={{ width: clip.width }}
                      className="h-full rounded border border-[var(--studio-border-strong)] bg-[var(--studio-accent-muted)] px-2 text-[10px] leading-8 text-[var(--studio-text-secondary)]"
                      title={clip.label}
                    >
                      <span className="block truncate">{clip.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center px-3 text-[11px] text-[var(--studio-text-tertiary)]">
                  {track === "Captions" ? "Captions track — coming soon" : "Drop clips here after import"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
