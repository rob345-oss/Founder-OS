import type { CrmDashboardMetrics } from "@/lib/crm/types";

import type { MarketingIntegrationStatus, MarketingPriority } from "../types";
import type { CrmPeriodCounts } from "./crm-analytics";

export function buildMarketingPriorities(input: {
  crmMetrics: CrmDashboardMetrics | null;
  period: CrmPeriodCounts;
  integrations: MarketingIntegrationStatus[];
  overdueContentCount: number;
  activeCampaignCount: number;
}): MarketingPriority[] {
  const out: MarketingPriority[] = [];

  const ga = input.integrations.find((i) => i.id === "website_analytics");
  if (ga && ga.state !== "connected") {
    out.push({
      id: "connect-analytics",
      priority: "high",
      title: "Connect website analytics",
      explanation: "Visitor and conversion KPIs stay inactive until GA4 (or another analytics provider) is wired.",
      href: "/marketing/integrations",
    });
  }

  if (input.crmMetrics && input.crmMetrics.followUpBuckets.overdue > 0) {
    out.push({
      id: "follow-ups-overdue",
      priority: "high",
      title: `${input.crmMetrics.followUpBuckets.overdue} leads awaiting follow-up`,
      explanation: "Overdue follow-ups in CRM need attention to protect conversion momentum.",
      metric: `${input.crmMetrics.followUpBuckets.overdue} overdue`,
      href: "/crm/follow-ups",
    });
  }

  if (input.overdueContentCount > 0) {
    out.push({
      id: "content-overdue",
      priority: "medium",
      title: `${input.overdueContentCount} scheduled posts are overdue`,
      explanation: "Content items passed their planned publish date without a published status.",
      metric: String(input.overdueContentCount),
      href: "/marketing/calendar",
    });
  }

  const wait = input.period.waitlistNew;
  if (wait.status === "live" && wait.changePct !== null && wait.changePct > 5) {
    out.push({
      id: "waitlist-momentum",
      priority: "medium",
      title: "Waitlist grew faster this period",
      explanation: `Waitlist registrations changed ${wait.changePct.toFixed(1)}% vs the previous equivalent period.`,
      metric: `${wait.value} new signups`,
      href: "/crm/waitlist",
    });
  }

  if (input.activeCampaignCount > 0) {
    out.push({
      id: "campaigns-active",
      priority: "low",
      title: "Review active campaign performance",
      explanation: `${input.activeCampaignCount} campaign(s) marked active — validate results and spend.`,
      metric: String(input.activeCampaignCount),
      href: "/marketing/campaigns",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "steady",
      priority: "low",
      title: "No urgent marketing alerts",
      explanation: "Connect more data sources or set goals to unlock richer recommendations.",
      href: "/marketing/goals",
    });
  }

  return out.slice(0, 6);
}
