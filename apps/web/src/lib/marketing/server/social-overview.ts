import { buildDailySeries, parseMarketingDateRange, percentChange } from "../date-range";
import type { MetricAvailability, SeriesPoint } from "../types";
import type { SocialKpiKey, SocialOverviewResponse, SocialPlatformId } from "../social-types";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORMS } from "../social-types";
import { loadSocialAttributedWaitlistCount } from "./social-crm-attribution";
import { isMarketingPublishArmed } from "./publish-guard";
import { metricsEngagements, pickDisplayMetrics } from "./social-metrics";
import { listSocialAccounts, listSocialPosts } from "./social-repository";

function inRange(iso: string | null, start: string, end: string): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= new Date(start).getTime() && t < new Date(end).getTime();
}

function metricLive(
  value: number,
  previous: number,
  series: SeriesPoint[],
  hint?: string,
): MetricAvailability {
  return {
    status: "live",
    value,
    previousValue: previous,
    changePct: percentChange(value, previous),
    series,
    hint,
  };
}

function metricUnavailable(message: string): MetricAvailability {
  return { status: "unconfigured", message };
}

export async function buildSocialOverview(query: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
  platform?: SocialPlatformId | null;
}): Promise<SocialOverviewResponse> {
  const dateRange = parseMarketingDateRange(query);
  const [posts, accounts] = await Promise.all([listSocialPosts({ platform: query.platform ?? undefined }), listSocialAccounts()]);
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const currentPosts = posts.filter(
    (p) =>
      inRange(p.publishedAt, dateRange.start, dateRange.end) ||
      (p.status === "published" && inRange(p.updatedAt, dateRange.start, dateRange.end)),
  );
  const prevPosts = posts.filter((p) => inRange(p.publishedAt, dateRange.previousStart, dateRange.previousEnd));

  const sumMetric = (items: typeof posts, pick: (m: ReturnType<typeof pickDisplayMetrics>) => number) => {
    let total = 0;
    for (const p of items) {
      const m = pickDisplayMetrics(p);
      if (!m) continue;
      total += pick(m);
    }
    return total;
  };

  const impressions = sumMetric(currentPosts, (m) => m?.impressions ?? 0);
  const prevImpressions = sumMetric(prevPosts, (m) => m?.impressions ?? 0);
  const reach = sumMetric(currentPosts, (m) => m?.reach ?? 0);
  const prevReach = sumMetric(prevPosts, (m) => m?.reach ?? 0);
  const engagements = sumMetric(currentPosts, (m) => (m ? metricsEngagements(m) : 0));
  const prevEngagements = sumMetric(prevPosts, (m) => (m ? metricsEngagements(m) : 0));
  const websiteClicks = sumMetric(currentPosts, (m) => m?.websiteClicks ?? m?.clicks ?? 0);
  const prevWebsiteClicks = sumMetric(prevPosts, (m) => m?.websiteClicks ?? m?.clicks ?? 0);
  const profileVisits = sumMetric(currentPosts, (m) => m?.profileVisits ?? 0);
  const prevProfileVisits = sumMetric(prevPosts, (m) => m?.profileVisits ?? 0);
  const followerGrowth = sumMetric(currentPosts, (m) => m?.followersGained ?? 0);
  const prevFollowerGrowth = sumMetric(prevPosts, (m) => m?.followersGained ?? 0);

  const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : null;
  const prevEngagementRate = prevImpressions > 0 ? (prevEngagements / prevImpressions) * 100 : null;

  const publishedCount = posts.filter((p) => p.status === "published" && inRange(p.publishedAt, dateRange.start, dateRange.end)).length;
  const prevPublished = posts.filter((p) => p.status === "published" && inRange(p.publishedAt, dateRange.previousStart, dateRange.previousEnd))
    .length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;

  const waitlistAttributed = await loadSocialAttributedWaitlistCount(dateRange.start, dateRange.end);
  const prevWaitlist = await loadSocialAttributedWaitlistCount(dateRange.previousStart, dateRange.previousEnd);

  const impressionBuckets = new Map<string, number>();
  const reachBuckets = new Map<string, number>();
  const engagementBuckets = new Map<string, number>();
  const clickBuckets = new Map<string, number>();
  const followerBuckets = new Map<string, number>();

  for (const p of currentPosts) {
    const day = (p.publishedAt ?? p.updatedAt).slice(0, 10);
    const m = pickDisplayMetrics(p);
    if (!m) continue;
    impressionBuckets.set(day, (impressionBuckets.get(day) ?? 0) + (m.impressions ?? 0));
    reachBuckets.set(day, (reachBuckets.get(day) ?? 0) + (m.reach ?? 0));
    engagementBuckets.set(day, (engagementBuckets.get(day) ?? 0) + metricsEngagements(m));
    clickBuckets.set(day, (clickBuckets.get(day) ?? 0) + (m.websiteClicks ?? m.clicks ?? 0));
    followerBuckets.set(day, (followerBuckets.get(day) ?? 0) + (m.followersGained ?? 0));
  }

  const series = {
    impressions: buildDailySeries(impressionBuckets, dateRange.start, dateRange.end),
    reach: buildDailySeries(reachBuckets, dateRange.start, dateRange.end),
    engagements: buildDailySeries(engagementBuckets, dateRange.start, dateRange.end),
    followersGained: buildDailySeries(followerBuckets, dateRange.start, dateRange.end),
    websiteClicks: buildDailySeries(clickBuckets, dateRange.start, dateRange.end),
  };

  const kpis: Record<SocialKpiKey, MetricAvailability> = {
    impressions:
      impressionBuckets.size || impressions > 0
        ? metricLive(impressions, prevImpressions, series.impressions, "From manual and synced post metrics")
        : metricUnavailable("Add manual metrics or connect platform analytics."),
    reach:
      reach > 0 ? metricLive(reach, prevReach, series.reach) : metricUnavailable("Reach not recorded for this period."),
    engagements:
      engagements > 0 ? metricLive(engagements, prevEngagements, series.engagements) : metricUnavailable("No engagement data yet."),
    engagementRate:
      engagementRate != null
        ? {
            status: "live",
            value: engagementRate,
            previousValue: prevEngagementRate ?? 0,
            changePct: prevEngagementRate != null ? percentChange(engagementRate, prevEngagementRate) : null,
            series: series.engagements.map((p) => ({ ...p, value: p.value })),
            hint: "Engagements ÷ impressions for posts with impressions recorded",
          }
        : metricUnavailable("Requires impressions and engagement counts."),
    followerGrowth:
      followerGrowth > 0
        ? metricLive(followerGrowth, prevFollowerGrowth, series.followersGained)
        : metricUnavailable("Follower deltas require platform account APIs or manual entry."),
    profileVisits:
      profileVisits > 0
        ? metricLive(profileVisits, prevProfileVisits, series.impressions)
        : metricUnavailable("Profile visits not available for connected accounts."),
    websiteClicks:
      websiteClicks > 0
        ? metricLive(websiteClicks, prevWebsiteClicks, series.websiteClicks)
        : metricUnavailable("Record link clicks on posts or connect platform analytics."),
    waitlistSignups:
      waitlistAttributed.status === "live"
        ? metricLive(waitlistAttributed.count, waitlistAttributed.previousCount, waitlistAttributed.series, waitlistAttributed.hint)
        : waitlistAttributed.metric,
    postsPublished: metricLive(publishedCount, prevPublished, series.impressions.map((p) => ({ ...p, value: publishedCount ? 1 : 0 }))),
    postsScheduled: metricLive(scheduledCount, scheduledCount, []),
  };

  const platformSummaries = SOCIAL_PLATFORMS.map((platform) => {
    const platPosts = currentPosts.filter((p) => p.platform === platform);
    const impr = sumMetric(platPosts, (m) => m?.impressions ?? 0);
    const eng = sumMetric(platPosts, (m) => (m ? metricsEngagements(m) : 0));
    const account = accountByPlatform.get(platform);
    return {
      platform,
      label: SOCIAL_PLATFORM_LABELS[platform],
      connectionState: account?.connectionState ?? "not_connected",
      postsPublished: platPosts.length,
      impressions: impr || null,
      engagements: eng || null,
      engagementRate: impr > 0 ? (eng / impr) * 100 : null,
    };
  });

  const ranked = [...posts]
    .filter((p) => p.status === "published")
    .map((p) => {
      const m = pickDisplayMetrics(p);
      return {
        post: p,
        impressions: m?.impressions ?? 0,
        rate: p.engagementRate,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);

  const topPosts = ranked.map(({ post, rate }) => {
    const m = pickDisplayMetrics(post);
    return {
      id: post.id,
      preview: post.bodyText.slice(0, 120) || post.internalLabel || "(No content)",
      platform: post.platform,
      publishedAt: post.publishedAt,
      impressions: m?.impressions ?? null,
      engagementRate: rate,
      likes: m?.likes ?? null,
      comments: m?.comments ?? null,
      shares: m?.shares ?? null,
      clicks: m?.clicks ?? null,
    };
  });

  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduledAt)
    .sort((a, b) => (a.scheduledAt! > b.scheduledAt! ? 1 : -1))
    .slice(0, 6);

  return {
    refreshedAt: new Date().toISOString(),
    dateRange,
    publishArmed: isMarketingPublishArmed(),
    kpis,
    series,
    platformSummaries,
    topPosts,
    upcoming,
    funnel: {
      stages: [
        {
          key: "impressions",
          label: "Social impressions",
          count: impressions || null,
          kind: impressions ? "measured" : "unavailable",
        },
        {
          key: "website_visits",
          label: "Website visits",
          count: null,
          kind: "unavailable",
          note: "Requires GA4 or tagged session data — not inferred from impressions.",
        },
        {
          key: "waitlist",
          label: "Waitlist signups (UTM social)",
          count: waitlistAttributed.status === "live" ? waitlistAttributed.count : null,
          kind: waitlistAttributed.status === "live" ? "attributed" : "unavailable",
          note: waitlistAttributed.hint,
        },
        {
          key: "qualified",
          label: "Qualified leads",
          count: null,
          kind: "unavailable",
          note: "Sourced from CRM lead stage — configure CRM sync.",
        },
        {
          key: "conversions",
          label: "Conversions",
          count: null,
          kind: "unavailable",
        },
      ],
    },
    filters: { platforms: query.platform ? [query.platform] : [...SOCIAL_PLATFORMS], accountIds: accounts.map((a) => a.id) },
  };
}