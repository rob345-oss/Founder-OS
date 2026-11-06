import type { KpiKey } from './types';

export const KPI_LABELS: Record<KpiKey, string> = {
  followers: 'Followers',
  follower_growth: 'Follower growth',
  reach: 'Reach',
  impressions: 'Impressions',
  engagements: 'Engagements',
  engagement_rate: 'Engagement rate',
  profile_visits: 'Profile visits',
  link_clicks: 'Link clicks',
  website_visits: 'Website visits',
  leads: 'Leads',
  conversion_rate: 'Conversion rate',
  published_content: 'Published content',
  campaign_performance: 'Campaign performance',
};

export const KPI_KEYS = Object.keys(KPI_LABELS) as KpiKey[];
