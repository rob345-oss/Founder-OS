import { describe, expect, it } from "vitest";

import { MARKETING_NAV } from "@/components/marketing/nav";

describe("marketing navigation", () => {
  it("includes all required module routes", () => {
    const hrefs = MARKETING_NAV.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain("/marketing");
    expect(hrefs).toContain("/marketing/analytics");
    expect(hrefs).toContain("/marketing/social");
    expect(hrefs).toContain("/marketing/content");
    expect(hrefs).toContain("/marketing/calendar");
    expect(hrefs).toContain("/marketing/growth");
    expect(hrefs).toContain("/marketing/campaigns");
    expect(hrefs).toContain("/marketing/audience");
    expect(hrefs).toContain("/marketing/activity");
    expect(hrefs).toContain("/marketing/goals");
    expect(hrefs).toContain("/marketing/integrations");
    expect(hrefs).toContain("/marketing/settings");
  });
});
