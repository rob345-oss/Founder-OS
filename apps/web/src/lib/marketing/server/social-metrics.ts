import type { SocialPostMetrics, SocialPostWithMetrics } from "../social-types";

export function sumEngagements(m: Pick<SocialPostMetrics, "likes" | "comments" | "shares" | "saves" | "clicks">): number {
  return (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0) + (m.clicks ?? 0);
}

export function engagementRate(impressions: number | null | undefined, engagements: number): number | null {
  if (impressions == null || impressions <= 0) return null;
  return (engagements / impressions) * 100;
}

export function pickDisplayMetrics(post: SocialPostWithMetrics): SocialPostMetrics | null {
  return post.latestManualMetrics ?? post.latestProviderMetrics;
}

export function metricsEngagements(m: SocialPostMetrics): number {
  if (m.engagements != null) return m.engagements;
  return sumEngagements(m);
}