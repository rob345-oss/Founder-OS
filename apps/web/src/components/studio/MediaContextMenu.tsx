"use client";

import { useEffect, useRef } from "react";

import type { StudioMediaPublic } from "@/lib/studio/client-api";

export type MediaContextMenuAction =
  | "open"
  | "favorite"
  | "add-editor"
  | "compare"
  | "reveal"
  | "rescan";

export function MediaContextMenu({
  item,
  x,
  y,
  onClose,
  onAction,
}: {
  item: StudioMediaPublic;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: MediaContextMenuAction) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const items: { id: MediaContextMenuAction; label: string; disabled?: boolean }[] = [
    { id: "open", label: "Open preview", disabled: item.missing },
    { id: "favorite", label: item.favorite ? "Unfavorite" : "Favorite" },
    { id: "add-editor", label: "Add to Video Editor" },
    { id: "reveal", label: "Reveal in Explorer", disabled: item.missing },
    { id: "compare", label: "Compare takes (select 2+)" },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      className="studio-panel fixed z-[60] min-w-[200px] p-1 py-1.5 shadow-2xl"
      style={{ left: x, top: y }}
    >
      <p className="mb-1 truncate px-2.5 pb-1 text-[10px] text-[var(--studio-text-tertiary)]">{item.fileName}</p>
      {items.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="menuitem"
          disabled={entry.disabled}
          className="flex w-full rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 text-left text-xs text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)] disabled:opacity-40"
          onClick={() => {
            onAction(entry.id);
            onClose();
          }}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
