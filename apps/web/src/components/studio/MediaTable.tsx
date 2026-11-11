import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { formatDuration, formatFileSize, formatRelativeTime } from "@/lib/studio/format";

import { CategoryBadge } from "./CategoryBadge";

export function MediaTable({
  items,
  selectedId,
  onSelect,
}: {
  items: StudioMediaPublic[];
  selectedId?: string | null;
  onSelect?: (item: StudioMediaPublic) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-[var(--studio-bg-3)] text-[11px] uppercase tracking-[0.12em] text-[var(--studio-text-tertiary)]">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Resolution</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Imported</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={[
                  "cursor-pointer border-t border-[var(--studio-border)] transition-colors",
                  selected ? "bg-[var(--studio-accent-muted)]" : "hover:bg-[var(--studio-bg-hover)]",
                ].join(" ")}
              >
                <td className="px-4 py-3 font-medium text-[var(--studio-text-primary)]">{item.fileName}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--studio-text-secondary)]">
                  {formatDuration(item.durationSeconds)}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">
                  {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{formatFileSize(item.fileSizeBytes)}</td>
                <td className="px-4 py-3 text-[var(--studio-text-secondary)]">{formatRelativeTime(item.dateAdded)}</td>
                <td className="px-4 py-3">
                  <CategoryBadge category={item.category} />
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[var(--studio-text-tertiary)]">{item.sourceHint}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
