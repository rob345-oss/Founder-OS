"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import {
  SocialPostMediaField,
  postMediaRefs,
  type PostMediaSlot,
} from "@/components/marketing/social/media/SocialPostMediaField";
import { fetchSocialMediaAssets, fetchSocialPost, recordSocialPostMetrics, updateSocialPostApi } from "@/lib/marketing/client-api";
import { SOCIAL_PLATFORM_LABELS, type SocialPostMetrics, type SocialPostWithMetrics } from "@/lib/marketing/social-types";

function MetricsSnapshot({
  label,
  metrics,
}: {
  label: string;
  metrics: SocialPostMetrics | null;
}) {
  if (!metrics) {
    return <p className="text-sm text-[var(--studio-text-tertiary)]">{label}: not recorded</p>;
  }
  return (
    <p className="text-sm text-[var(--studio-text-secondary)]">
      <span className="font-medium text-[var(--studio-text-primary)]">{label}: </span>
      {metrics.impressions ?? 0} impr. · {metrics.likes ?? 0} likes · {metrics.comments ?? 0} comments ·{" "}
      {metrics.shares ?? 0} shares
    </p>
  );
}

function MetricsForm({
  impressions,
  setImpressions,
  likes,
  setLikes,
  comments,
  setComments,
  shares,
  setShares,
  clicks,
  setClicks,
  onSave,
  message,
}: {
  impressions: string;
  setImpressions: (v: string) => void;
  likes: string;
  setLikes: (v: string) => void;
  comments: string;
  setComments: (v: string) => void;
  shares: string;
  setShares: (v: string) => void;
  clicks: string;
  setClicks: (v: string) => void;
  onSave: () => void;
  message: string | null;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["Impressions", impressions, setImpressions],
            ["Likes", likes, setLikes],
            ["Comments", comments, setComments],
            ["Shares", shares, setShares],
            ["Clicks", clicks, setClicks],
          ] as const
        ).map(([label, value, setValue]) => (
          <label key={label} className="text-xs text-[var(--studio-text-tertiary)]">
            {label}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1 text-sm"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onSave}
        className="mt-3 rounded-md bg-[var(--studio-accent)] px-3 py-2 text-sm text-white"
      >
        Save manual metrics
      </button>
      {message ? <p className="mt-2 text-xs text-[var(--studio-success)]">{message}</p> : null}
    </>
  );
}

export default function SocialPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useMarketingSession();
  const [post, setPost] = useState<SocialPostWithMetrics | null>(null);
  const [impressions, setImpressions] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [clicks, setClicks] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [media, setMedia] = useState<PostMediaSlot[]>([]);

  useEffect(() => {
    if (!token || !id) return;
    void fetchSocialPost(token, id).then(async (p) => {
      setPost(p);
      if (!p.mediaRefs.length) {
        setMedia([]);
        return;
      }
      const assets = await fetchSocialMediaAssets(token, { ids: p.mediaRefs });
      const map = new Map(assets.map((a) => [a.id, a]));
      setMedia(
        p.mediaRefs.map((assetId) => ({
          assetId,
          altText: map.get(assetId)?.altText ?? "",
          asset: map.get(assetId),
        })),
      );
    });
  }, [token, id]);

  async function saveMedia() {
    if (!token || !id || !post) return;
    if (media.some((m) => m.uploading)) {
      setMessage("Wait for uploads to finish.");
      return;
    }
    const updated = await updateSocialPostApi(token, id, {
      mediaRefs: postMediaRefs(media),
      expectedUpdatedAt: post.updatedAt,
    });
    setPost(updated);
    setMessage("Media saved");
  }

  async function onMetrics() {
    if (!token || !id) return;
    const parse = (v: string) => (v.trim() ? Number(v) : null);
    await recordSocialPostMetrics(token, id, {
      impressions: parse(impressions),
      likes: parse(likes),
      comments: parse(comments),
      shares: parse(shares),
      clicks: parse(clicks),
      notes: "Manual entry",
    });
    setMessage("Manual metrics saved (separate from future API sync).");
    setPost(await fetchSocialPost(token, id));
  }

  async function markPublished() {
    if (!token || !id) return;
    const updated = await updateSocialPostApi(token, id, { status: "published", publishedAt: new Date().toISOString() });
    setPost(updated);
  }

  if (!post) {
    return (
      <MarketingModuleScaffold eyebrow="Social" title="Post" description="Loading…">
        <div className="h-32 animate-pulse rounded-lg bg-[var(--studio-bg-2)]" />
      </MarketingModuleScaffold>
    );
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title={post.internalLabel || "Post detail"}
      description={`${SOCIAL_PLATFORM_LABELS[post.platform]} · ${post.status.replace(/_/g, " ")} · external: ${post.externalPublishState.replace(/_/g, " ")}`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 space-y-4">
          <SocialPostMediaField token={token} platform={post.platform} value={media} onChange={setMedia} />
          <button type="button" onClick={() => void saveMedia()} className="rounded-md border border-[var(--studio-border)] px-3 py-2 text-xs">
            Save media attachments
          </button>
          {message ? <p className="text-xs text-[var(--studio-success)]">{message}</p> : null}
          <p className="whitespace-pre-wrap text-sm text-[var(--studio-text-primary)]">{post.bodyText || "(No body)"}</p>
          {post.platformPermalink ? (
            <a
              href={post.platformPermalink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-[var(--studio-accent)] hover:underline"
            >
              Open on platform
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void markPublished()}
            className="mt-4 block text-xs text-[var(--studio-text-secondary)] hover:underline"
          >
            Mark as published (manual)
          </button>
        </section>

        <section className="space-y-4">
          <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
            <h3 className="text-sm font-semibold text-[var(--studio-text-primary)]">Performance</h3>
            <div className="mt-3 space-y-2">
              <MetricsSnapshot label="Manual" metrics={post.latestManualMetrics} />
              <MetricsSnapshot label="Provider (API)" metrics={post.latestProviderMetrics} />
              <p className="text-sm text-[var(--studio-text-primary)]">
                Engagement rate: {post.engagementRate != null ? `${post.engagementRate.toFixed(2)}%` : "—"}
              </p>
            </div>
          </div>
          <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
            <h3 className="text-sm font-semibold text-[var(--studio-text-primary)]">Record manual metrics</h3>
            <MetricsForm
              impressions={impressions}
              setImpressions={setImpressions}
              likes={likes}
              setLikes={setLikes}
              comments={comments}
              setComments={setComments}
              shares={shares}
              setShares={setShares}
              clicks={clicks}
              setClicks={setClicks}
              onSave={() => void onMetrics()}
              message={message}
            />
          </div>
        </section>
      </div>
    </MarketingModuleScaffold>
  );
}