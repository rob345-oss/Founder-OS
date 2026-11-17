"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchSocialMediaAssets,
  uploadSocialMediaAsset,
  validateSocialMediaForPlatform,
} from "@/lib/marketing/client-api";
import type { SocialMediaAsset } from "@/lib/marketing/social-media-types";
import type { SocialPlatformId } from "@/lib/marketing/social-types";

import { SocialMediaLibraryPicker } from "./SocialMediaLibraryPicker";
import { SocialMediaThumbnail } from "./SocialMediaThumbnail";

export type PostMediaSlot = {
  assetId: string;
  altText: string;
  asset?: SocialMediaAsset;
  uploading?: boolean;
  error?: string;
};

type Props = {
  token: string | null;
  platform: SocialPlatformId;
  value: PostMediaSlot[];
  onChange: (next: PostMediaSlot[]) => void;
  disabled?: boolean;
};

function MediaRow({
  slot,
  token,
  onRemove,
  onAlt,
  onUp,
  onDown,
  canUp,
  canDown,
  disabled,
}: {
  slot: PostMediaSlot;
  token: string | null;
  onRemove: () => void;
  onAlt: (v: string) => void;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  disabled?: boolean;
}) {
  const asset = slot.asset;

  return (
    <li className="flex gap-3 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-2">
      <div className="flex shrink-0 flex-col gap-1 self-center">
        <button type="button" disabled={disabled || !canUp} onClick={onUp} className="text-[10px] text-[var(--studio-text-tertiary)]">
          ▲
        </button>
        <button type="button" disabled={disabled || !canDown} onClick={onDown} className="text-[10px] text-[var(--studio-text-tertiary)]">
          ▼
        </button>
      </div>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--studio-border)] bg-white">
        {slot.uploading ? (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--studio-text-tertiary)]">…</div>
        ) : asset ? (
          <SocialMediaThumbnail token={token} asset={asset} className="h-full w-full object-cover" controls={false} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-xs font-medium text-[var(--studio-text-primary)]">
          {asset?.title ?? slot.assetId}
          {asset ? (
            <span className="ml-2 text-[10px] font-normal uppercase text-[var(--studio-text-tertiary)]">{asset.assetType}</span>
          ) : null}
        </p>
        {slot.error ? <p className="text-[10px] text-red-400">{slot.error}</p> : null}
        <input
          value={slot.altText}
          onChange={(e) => onAlt(e.target.value)}
          disabled={disabled || slot.uploading}
          placeholder="Alt text (images)"
          className="w-full rounded-md border border-[var(--studio-border)] bg-white px-2 py-1 text-[11px]"
        />
      </div>
      <button type="button" onClick={onRemove} disabled={disabled} className="self-start text-xs text-red-400 hover:underline">
        Remove
      </button>
    </li>
  );
}

export function SocialPostMediaField({ token, platform, value, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compat, setCompat] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const hydrate = useCallback(
    async (slots: PostMediaSlot[]) => {
      if (!token) return;
      const missing = slots.filter((s) => !s.asset && !s.uploading).map((s) => s.assetId);
      if (!missing.length) return;
      const items = await fetchSocialMediaAssets(token, { ids: missing });
      const map = new Map(items.map((a) => [a.id, a]));
      onChange(
        slots.map((s) => ({
          ...s,
          asset: s.asset ?? map.get(s.assetId),
          altText: s.altText || map.get(s.assetId)?.altText || "",
        })),
      );
    },
    [token, onChange],
  );

  useEffect(() => {
    void hydrate(value);
  }, [value, hydrate]);

  const ids = useMemo(() => value.filter((v) => !v.uploading).map((v) => v.assetId), [value]);

  useEffect(() => {
    if (!token || !ids.length) {
      setCompat([]);
      return;
    }
    void validateSocialMediaForPlatform(token, platform, ids).then((r) => {
      setCompat(r.issues.map((i) => i.message));
    });
  }, [token, platform, ids]);

  async function uploadFiles(files: FileList | File[]) {
    if (!token) return;
    const list = [...files];
    for (const file of list) {
      const tempId = `uploading-${file.name}-${Date.now()}`;
      onChange([...valueRef.current, { assetId: tempId, altText: "", uploading: true }]);
      try {
        const asset = await uploadSocialMediaAsset(token, file);
        const base = valueRef.current.filter((p) => p.assetId !== tempId);
        onChange([...base, { assetId: asset.id, altText: asset.altText ?? "", asset }]);
      } catch (e) {
        onChange(
          valueRef.current.map((p) =>
            p.assetId === tempId ? { ...p, uploading: false, error: e instanceof Error ? e.message : "Upload failed" } : p,
          ),
        );
      }
    }
  }

  function onLibraryPick(assets: SocialMediaAsset[]) {
    const existing = new Set(value.map((v) => v.assetId));
    const added = assets
      .filter((a) => !existing.has(a.id))
      .map((a) => ({ assetId: a.id, altText: a.altText ?? "", asset: a }));
    onChange([...value, ...added]);
    setPickerOpen(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    onChange(next);
  }

  const pending = value.some((v) => v.uploading);

  return (
    <section className="space-y-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text-primary)]">Media</h3>
          <p className="text-[11px] text-[var(--studio-text-tertiary)]">Upload from device or choose from library.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-[var(--studio-border)] bg-white px-3 py-1.5 text-xs font-medium"
          >
            Upload
          </button>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => setPickerOpen(true)}
            className="rounded-lg border border-[var(--studio-border)] bg-white px-3 py-1.5 text-xs font-medium"
          >
            Media library
          </button>
        </div>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver ? "border-[var(--studio-accent)] bg-white" : "border-[var(--studio-border)]"
        }`}
      >
        <p className="text-xs text-[var(--studio-text-secondary)]">Drop images or videos here</p>
        <p className="mt-1 text-[10px] text-[var(--studio-text-tertiary)]">JPEG, PNG, WebP, GIF · MP4, MOV</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {value.length ? (
        <ul className="space-y-2">
          {value.map((slot, index) => (
            <MediaRow
              key={slot.assetId}
              slot={slot}
              token={token}
              disabled={disabled}
              canUp={index > 0}
              canDown={index < value.length - 1}
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => onChange(value.filter((v) => v.assetId !== slot.assetId))}
              onAlt={(altText) => onChange(value.map((v) => (v.assetId === slot.assetId ? { ...v, altText } : v)))}
            />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--studio-text-tertiary)]">No media attached yet.</p>
      )}

      {compat.length ? (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">
          {compat.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      ) : null}

      {pending ? <p className="text-xs text-[var(--studio-text-tertiary)]">Uploading…</p> : null}

      <SocialMediaLibraryPicker token={token} open={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={onLibraryPick} />
    </section>
  );
}

export function postMediaRefs(slots: PostMediaSlot[]): string[] {
  return slots.filter((s) => !s.uploading && !s.error).map((s) => s.assetId);
}