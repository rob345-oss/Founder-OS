"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchSocialMediaAssets } from "@/lib/marketing/client-api";
import type { SocialMediaAsset, SocialMediaAssetType } from "@/lib/marketing/social-media-types";

import { SocialMediaThumbnail } from "./SocialMediaThumbnail";

type Props = {
  token: string | null;
  open: boolean;
  onClose: () => void;
  onAdd: (assets: SocialMediaAsset[]) => void;
};

export function SocialMediaLibraryPicker({ token, open, onClose, onAdd }: Props) {
  const [items, setItems] = useState<SocialMediaAsset[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | SocialMediaAssetType>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SocialMediaAsset | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    void fetchSocialMediaAssets(token, { q: q || undefined, assetType: type || undefined })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open, token, q, type]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setPreview(null);
    }
  }, [open]);

  const selectedAssets = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal>
      <div className="flex h-[min(90vh,720px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--studio-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--studio-text-primary)]">Media library</h2>
            <p className="text-[11px] text-[var(--studio-text-tertiary)]">Select assets to attach — no re-upload required.</p>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-[var(--studio-text-tertiary)]">
            Close
          </button>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name"
                className="min-w-[160px] flex-1 rounded-lg border border-[var(--studio-border)] bg-white px-3 py-2 text-sm"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "" | SocialMediaAssetType)}
                className="rounded-lg border border-[var(--studio-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
              </select>
            </div>
            {loading ? <p className="text-xs text-[var(--studio-text-tertiary)]">Loading…</p> : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => {
                const on = selected.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(item.id)) n.delete(item.id);
                        else n.add(item.id);
                        return n;
                      });
                    }}
                    onDoubleClick={() => setPreview(item)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition ${
                      on ? "border-[var(--studio-accent)] ring-2 ring-[var(--studio-accent)]/30" : "border-[var(--studio-border)]"
                    }`}
                  >
                    <div className="aspect-square bg-white">
                      <SocialMediaThumbnail token={token} asset={item} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-0.5 bg-[var(--studio-bg-1)] p-2">
                      <p className="truncate text-[11px] font-medium">{item.title}</p>
                      <p className="text-[10px] text-[var(--studio-text-tertiary)]">
                        {item.assetType}
                        {item.byteSize != null ? ` · ${Math.round(item.byteSize / 1024)} KB` : ""}
                      </p>
                    </div>
                    {on ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[var(--studio-accent)] px-2 py-0.5 text-[10px] text-white">
                        Selected
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          {preview ? (
            <aside className="hidden w-72 shrink-0 border-l border-[var(--studio-border)] p-4 lg:block">
              <SocialMediaThumbnail token={token} asset={preview} className="max-h-48 w-full rounded-lg object-contain" controls />
              <p className="mt-2 text-sm font-medium">{preview.title}</p>
            </aside>
          ) : null}
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--studio-border)] px-5 py-3">
          <p className="text-xs text-[var(--studio-text-tertiary)]">{selected.size} selected</p>
          <button
            type="button"
            disabled={!selected.size}
            onClick={() => onAdd(selectedAssets)}
            className="rounded-lg bg-[var(--studio-accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Add to post
          </button>
        </footer>
      </div>
    </div>
  );
}