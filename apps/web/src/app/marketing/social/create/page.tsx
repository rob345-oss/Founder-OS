"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { buildSocialTrackedLink, createSocialPost } from "@/lib/marketing/client-api";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS } from "@/lib/marketing/social-types";

export default function SocialCreatePostPage() {
  const { token } = useMarketingSession();
  const router = useRouter();
  const [platform, setPlatform] = useState<(typeof SOCIAL_PLATFORMS)[number]>("linkedin");
  const [internalLabel, setInternalLabel] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [manualOnly, setManualOnly] = useState(false);
  const [permalink, setPermalink] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("https://titaniumguardian.com");
  const [utmCampaign, setUtmCampaign] = useState("guardian-waitlist");
  const [trackedUrl, setTrackedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(status: "draft" | "scheduled" | "published") {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const post = await createSocialPost(token, {
        platform,
        internalLabel: internalLabel || null,
        bodyText,
        status,
        scheduledAt: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        publishedAt: status === "published" ? new Date().toISOString() : null,
        platformPermalink: permalink || null,
        isManualTrackOnly: manualOnly || status === "published",
      });
      router.push(`/marketing/social/posts/${post.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBuildLink() {
    if (!token) return;
    try {
      const res = await buildSocialTrackedLink(token, {
        destinationUrl,
        utmSource: platform,
        utmMedium: "social",
        utmCampaign,
        label: internalLabel || `${platform} post`,
      });
      setTrackedUrl(res.trackedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Link build failed");
    }
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Social command center"
      title="Create post"
      description="Draft for internal scheduling or register external posts. AI assistance and multi-variant previews arrive in M2."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as (typeof SOCIAL_PLATFORMS)[number])}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Internal label
            <input
              value={internalLabel}
              onChange={(e) => setInternalLabel(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Post text
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--studio-text-secondary)]">
            <input type="checkbox" checked={manualOnly} onChange={(e) => setManualOnly(e.target.checked)} />
            Manual track only (already published outside Founder OS)
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Platform permalink (optional)
            <input
              value={permalink}
              onChange={(e) => setPermalink(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Schedule (local datetime)
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave("draft")}
              className="rounded-md border border-[var(--studio-border)] px-4 py-2 text-sm"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving || !scheduledAt}
              onClick={() => void onSave("scheduled")}
              className="rounded-md border border-[var(--studio-border)] px-4 py-2 text-sm"
            >
              Schedule internally
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave("published")}
              className="rounded-md bg-[var(--studio-accent)] px-4 py-2 text-sm text-white"
            >
              Register published
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <SocialPreview text={bodyText} platform={SOCIAL_PLATFORM_LABELS[platform]} />
          <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
            <h3 className="text-sm font-semibold text-[var(--studio-text-primary)]">Tracked link builder</h3>
            <input
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="mt-3 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              placeholder="Destination URL"
            />
            <input
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              placeholder="utm_campaign"
            />
            <button type="button" onClick={() => void onBuildLink()} className="mt-3 text-sm text-[var(--studio-accent)] hover:underline">
              Generate UTM link
            </button>
            {trackedUrl ? (
              <p className="mt-2 break-all text-xs text-[var(--studio-text-secondary)]">{trackedUrl}</p>
            ) : null}
          </div>
        </div>
      </div>
    </MarketingModuleScaffold>
  );
}

function SocialPreview({ text, platform }: { text: string; platform: string }) {
  return (
    <div className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">Preview · {platform}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--studio-text-primary)]">{text || "Start writing to preview."}</p>
    </div>
  );
}