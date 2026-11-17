"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  archiveSocialMediaAsset,
  deleteSocialMediaAsset,
  fetchSocialMediaAsset,
  fetchSocialMediaAssets,
  updateSocialMediaAsset,
  uploadSocialMediaAsset,
} from "@/lib/marketing/client-api";
import type { SocialMediaAsset, SocialMediaAssetType } from "@/lib/marketing/social-media-types";

import { SocialMediaThumbnail } from "./SocialMediaThumbnail";

type Props = {
  token: string | null;
};

export function SocialMediaLibraryWorkspace({ token }: Props) {
  const [items, setItems] = useState<SocialMediaAsset[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | SocialMediaAssetType>("");
  const [selected, setSelected] = useState<SocialMediaAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    const next = await fetchSocialMediaAssets(token, { q: q || undefined, assetType: type || undefined });
    setItems(next);
    if (selected) {
      const detail = await fetchSocialMediaAsset(token, selected.id, true);
      setSelected(detail);
    }
  }, [token, q, type, selected]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filters change only
  }, [token, q, type]);

  async function onUpload(files: FileList) {
    if (!token) return;
    setMessage(null);
    for (const file of [...files]) {
      try {
        await uploadSocialMediaAsset(token, file);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Upload failed");
      }
    }
    await reload();
    setMessage("Upload complete");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="min-w-[140px] flex-1 rounded-lg border border-[var(--studio-border)] bg-white px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "" | SocialMediaAssetType)}
            className="rounded-lg border border-[var(--studio-border)] bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-[var(--studio-accent)] px-4 py-2 text-sm text-white"
          >
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
            onChange={(e) => e.target.files && void onUpload(e.target.files)}
          />
        </div>
        {message ? <p className="text-xs text-[var(--studio-text-secondary)]">{message}</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => token && void fetchSocialMediaAsset(token, item.id, true).then(setSelected)}
              className={`overflow-hidden rounded-xl border text-left ${
                selected?.id === item.id ? "border-[var(--studio-accent)]" : "border-[var(--studio-border)]"
              }`}
            >
              <div className="aspect-square bg-white">
                <SocialMediaThumbnail
                  token={token}
                  asset={item}
                  className="h-full w-full object-cover"
                  controls={item.assetType === "video"}
                />
              </div>
              <div className="bg-[var(--studio-bg-1)] p-2">
                <p className="truncate text-xs font-medium">{item.title}</p>
                <p className="text-[10px] text-[var(--studio-text-tertiary)]">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <aside className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
        {selected ? (
          <SelectedDetail token={token} asset={selected} onChange={reload} />
        ) : (
          <p className="text-sm text-[var(--studio-text-tertiary)]">Select an asset to view metadata and usage.</p>
        )}
      </aside>
    </div>
  );
}

function SelectedDetail({
  token,
  asset,
  onChange,
}: {
  token: string | null;
  asset: SocialMediaAsset;
  onChange: () => Promise<void>;
}) {
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description ?? "");
  const [altText, setAltText] = useState(asset.altText ?? "");

  useEffect(() => {
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setAltText(asset.altText ?? "");
  }, [asset]);

  return (
    <div className="space-y-3">
      <SocialMediaThumbnail token={token} asset={asset} className="max-h-40 w-full rounded-lg object-contain" controls />
      <label className="block text-xs text-[var(--studio-text-tertiary)]">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1 text-sm" />
      </label>
      <label className="block text-xs text-[var(--studio-text-tertiary)]">
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-md border px-2 py-1 text-sm" />
      </label>
      <label className="block text-xs text-[var(--studio-text-tertiary)]">
        Alt text
        <input value={altText} onChange={(e) => setAltText(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1 text-sm" />
      </label>
      <dl className="space-y-1 text-[11px] text-[var(--studio-text-secondary)]">
        <div>Type: {asset.assetType}</div>
        {asset.mimeType ? <div>MIME: {asset.mimeType}</div> : null}
        {asset.byteSize != null ? <div>Size: {Math.round(asset.byteSize / 1024)} KB</div> : null}
        {asset.width && asset.height ? (
          <div>
            Dimensions: {asset.width}×{asset.height}
          </div>
        ) : null}
        {asset.usedByPostIds?.length ? (
          <div>
            Used by {asset.usedByPostIds.length} post(s)
          </div>
        ) : (
          <div>Not referenced by active posts</div>
        )}
      </dl>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={() => token && void updateSocialMediaAsset(token, asset.id, { title, description, altText }).then(onChange)}
          className="rounded-md border px-3 py-1.5 text-xs"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => token && void archiveSocialMediaAsset(token, asset.id).then(onChange)}
          className="rounded-md border px-3 py-1.5 text-xs"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={() => token && void deleteSocialMediaAsset(token, asset.id).then(onChange)}
          className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}