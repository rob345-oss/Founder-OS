import { describe, expect, it } from "vitest";

import { buildMarketingPriorities } from "../server/priorities";

describe("buildMarketingPriorities", () => {
  it("surfaces analytics setup when not connected", () => {
    const priorities = buildMarketingPriorities({
      crmMetrics: null,
      period: {
        waitlistNew: { status: "live", value: 1, previousValue: 1, changePct: 0, series: [] },
        qualifiedLeads: { status: "live", value: 0, previousValue: 0, changePct: 0, series: [] },
        customersNew: { status: "live", value: 0, previousValue: 0, changePct: 0, series: [] },
        totalQualifiedNow: 0,
        totalCustomersNow: 0,
        totalWaitlistNow: 1,
      },
      integrations: [
        { id: "website_analytics", label: "GA4", state: "setup_required", detail: "" },
      ],
      overdueContentCount: 0,
      activeCampaignCount: 0,
    });
    expect(priorities.some((p) => p.id === "connect-analytics")).toBe(true);
  });
});
