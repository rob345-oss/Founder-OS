import type { CrmPeriodCounts } from "./crm-analytics";
import type { FunnelStage, MarketingDateRange, MetricAvailability } from "../types";

export function buildAcquisitionFunnel(
  range: MarketingDateRange,
  crm: CrmPeriodCounts,
  visitors: MetricAvailability,
): { stages: FunnelStage[]; limitation?: string } {
  const visitorCount = visitors.status === "live" ? visitors.value : null;
  const visitorPrev = visitors.status === "live" ? visitors.previousValue : null;

  const waitCur = crm.waitlistNew.status === "live" ? crm.waitlistNew.value : 0;
  const waitPrev = crm.waitlistNew.status === "live" ? crm.waitlistNew.previousValue : 0;
  const qualCur = crm.qualifiedLeads.status === "live" ? crm.qualifiedLeads.value : 0;
  const qualPrev = crm.qualifiedLeads.status === "live" ? crm.qualifiedLeads.previousValue : 0;
  const custCur = crm.customersNew.status === "live" ? crm.customersNew.value : 0;
  const custPrev = crm.customersNew.status === "live" ? crm.customersNew.previousValue : 0;

  const activatedCur = qualCur; // CRM proxy: qualified+ treated as activated interest
  const activatedPrev = qualPrev;

  const conv = (from: number | null, to: number) => (from && from > 0 ? (to / from) * 100 : null);
  const drop = (from: number | null, to: number) => (from && from > 0 ? ((from - to) / from) * 100 : null);

  const stages: FunnelStage[] = [
    {
      key: "websiteVisitors",
      label: "Website visitors",
      count: visitorCount ?? 0,
      previousCount: visitorPrev ?? 0,
      conversionFromPrevious: null,
      dropOffPct: null,
      href: "/marketing/analytics",
      note: visitorCount === null ? "Connect website analytics to populate." : undefined,
    },
    {
      key: "waitlistSignups",
      label: "Waitlist signups",
      count: waitCur,
      previousCount: waitPrev,
      conversionFromPrevious: conv(visitorCount, waitCur),
      dropOffPct: drop(visitorCount, waitCur),
      href: "/crm/waitlist",
    },
    {
      key: "qualifiedLeads",
      label: "Qualified leads",
      count: qualCur,
      previousCount: qualPrev,
      conversionFromPrevious: conv(waitCur, qualCur),
      dropOffPct: drop(waitCur, qualCur),
      href: "/crm/pipeline",
    },
    {
      key: "activatedUsers",
      label: "Activated users",
      count: activatedCur,
      previousCount: activatedPrev,
      conversionFromPrevious: conv(qualCur, activatedCur),
      dropOffPct: null,
      href: "/marketing/growth",
      note: "Proxy: CRM qualified+ stages until product activation telemetry is connected.",
    },
    {
      key: "payingCustomers",
      label: "Paying customers",
      count: custCur,
      previousCount: custPrev,
      conversionFromPrevious: conv(activatedCur, custCur),
      dropOffPct: drop(activatedCur, custCur),
      href: "/crm/pipeline",
      note: "CRM converted contacts — billing attribution not yet connected.",
    },
  ];

  const limitation =
    visitorCount === null
      ? "Visitor counts are unavailable without website analytics. Middle funnel stages use CRM cohorts (date_added) and may not reflect true multi-touch attribution."
      : "Stages use period-based CRM counts; cross-stage identity is not deduplicated across visitor and waitlist sources.";

  return { stages, limitation };
}
