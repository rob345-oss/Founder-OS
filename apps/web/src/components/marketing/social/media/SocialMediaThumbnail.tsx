"use client";

import { useEffect, useState } from "react";

import type { SocialMediaAsset } from "@/lib/marketing/social-media-types";

export function marketingMediaContentPath(assetId: string): string {
  return `/api/marketing/social/media-assets/${assetId}/content`;
}

type Props = {
  token: string | null;
  asset: Pick<SocialMediaAsset, "id" | "assetType" | "mimeType" | "title">;
  className?: string;
  controls?: boolean;
};

export function SocialMediaThumbnail({ token, asset, className, controls }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let revoked: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(marketingMediaContentPath(asset.id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("load failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setSrc(url);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [token, asset.id]);

  if (error) {
    return (
      <div className={className ?? "flex h-full w-full items-center justify-center bg-[var(--studio-bg-1)] text-[10px] text-[var(--studio-text-tertiary)]"}>
        No preview
      </div>
    );
  }

  if (!src) {
    return <div className={`${className ?? ""} animate-pulse bg-[var(--studio-bg-1)]`} aria-hidden />;
  }

  if (asset.assetType === "video") {
    return <video src={src} className={className} muted playsInline controls={controls} preload="metadata" aria-label={asset.title} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
  return <img src={src} alt={asset.title} className={className} />;
}