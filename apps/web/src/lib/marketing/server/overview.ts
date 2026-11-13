import { getDashboardMetrics } from "@/lib/crm/server/repository";
import type { CrmActivity } from "@/lib/crm/types";

import { parseMarketingDateRange, percentChange } from "../date-range";
import type { MarketingActivityItem, MarketingOverviewResponse } from "../types";
import { getCrmPeriodCounts } from "./crm-analytics";
import { buildAcquisitionFunnel } from "./funnel";
import { collectMarketingIntegrations, integrationsSummary, isWebsiteAnalyticsLive } from "./integrations";
import { buildMarketingPriorities } from "./priorities";
import {
  countOverdueScheduledContent,
  listCampaigns,
  topPublishedContent,
} from "./repository";

function activityToFeed(activities: CrmActivity[]): MarketingActivityItem[] {
  return activities.slice(0, 12).map((a) => ({
    id: a.id,
    type: a.eventType,
    summary: humanizeActivity(a.eventType),
    occurredAt: a.occurredAt,
    href: `/crm/contacts/${a.contactId}`,
  }));
}

function humanizeActivity(eventType: string): string {
  const map: Record<string, string> = {
    waitlist_sync: "Waitlist synchronized from Titanium Guardian",
    email_sent: "Outbound email recorded",
    note_added: "CRM note added",
    follow_up_created: "Follow-up scheduled",
    stage_changed: "Pipeline stage updated",
  };
  return map[eventType] ?? `CRM event: ${eventType.replaceAll("_", " ")}`;
}

function growthInsightFrom(
  waitlist: { status: string; changePct?: number | null; value?: number; previousValue?: number },
): string | null {
  if (waitlist.status !== "live" || waitlist.changePct === null || waitlist.changePct === undefined) return null;
  if (waitlist.previousValue === 0 && (waitlist.value ?? 0) === 0) return null;
  const dir = waitlist.changePct >= 0 ? "increased" : "decreased";
  return `Waitlist registrations ${dir} ${Math.abs(waitlist.changePct).toFixed(1)}% compared with the previous period.`;
}

export async function buildMarketingOverview(searchParams: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<MarketingOverviewResponse> {
  const dateRange = parseMarketingDateRange(searchParams);
  const crmPeriod = await getCrmPeriodCounts(dateRange);
  const crmMetrics = await getDashboardMetrics().catch(() => null);
  const integrations = collectMarketingIntegrations();
  const campaigns = await listCampaigns().catch(() => []);
  const overdueContent = await countOverdueScheduledContent().catch(() => 0);
  const topContent = await topPublishedContent(5);

  const visitorsMetric: import("../types").MetricAvailability = isWebsiteAnalyticsLive()
    ? { status: "live", value: 0, previousValue: 0, changePct: 0, series: [] }
    : { status: "unconfigured", message: "Connect analytics to activate this metric." };

  const visitorWaitlist =
    visitorsMetric.status === "live" && crmPeriod.waitlistNew.status === "live" && visitorsMetric.value > 0
      ? {
          status: "live" as const,
          value: (crmPeriod.waitlistNew.value / visitorsMetric.value) * 100,
          previousValue:
            visitorsMetric.previousValue > 0
              ? (crmPeriod.waitlistNew.previousValue / visitorsMetric.previousValue) * 100
              : 0,
          changePct:
            visitorsMetric.previousValue > 0 && crmPeriod.waitlistNew.previousValue > 0
              ? percentChange(
                  (crmPeriod.waitlistNew.value / visitorsMetric.value) * 100,
                  (crmPeriod.waitlistNew.previousValue / visitorsMetric.previousValue) * 100,
                )
              : null,
          series: [],
          hint: "Waitlist signups ÷ website visitors (same period).",
        }
      : ({ status: "unconfigured", message: "Requires website analytics and waitlist data with comparable periods." } as const);

  const socialReach = {
    status: "unconfigured" as const,
    message: "Connect social platforms to aggregate reach.",
  };

  const leads = await (async () => {
    const q = crmPeriod.qualifiedLeads;
    if (q.status === "live") {
      return { ...q, hint: "Qualified+ pipeline stages; excludes duplicate waitlist-only contacts." };
    }
    return q;
  })();

  const customerConversion =
    crmPeriod.customersNew.status === "live"
      ? {
          ...crmPeriod.customersNew,
          hint: "CRM converted contacts in period — unattributed billing conversions not included.",
        }
      : crmPeriod.customersNew;

  const funnel = buildAcquisitionFunnel(dateRange, crmPeriod, visitorsMetric);

  const priorities = buildMarketingPriorities({
    crmMetrics,
    period: crmPeriod,
    integrations,
    overdueContentCount: overdueContent,
    activeCampaignCount: campaigns.filter((c) => c.status === "active").length,
  });

  return {
    refreshedAt: new Date().toISOString(),
    dateRange,
    kpis: {
      websiteVisitors: visitorsMetric,
      waitlistSignups: crmPeriod.waitlistNew,
      visitorWaitlistConversion: visitorWaitlist,
      socialReach,
      leadsGenerated: leads,
      marketingCustomerConversion: customerConversion,
    },
    growth: {
      visitors: visitorsMetric,
      waitlist: crmPeriod.waitlistNew,
      leads: crmPeriod.qualifiedLeads,
      customers: crmPeriod.customersNew,
    },
    growthInsight: growthInsightFrom(crmPeriod.waitlistNew),
    funnel,
    topContent,
    activity: crmMetrics ? activityToFeed(crmMetrics.recentActivity) : [],
    priorities,
    integrationsSummary: integrationsSummary(integrations),
  };
}
