import { describe, expect, it } from "vitest";

import { MARKETING_NAV } from "@/components/marketing/nav";

describe("marketing navigation", () => {
  it("includes social command center routes", () => {
    const hrefs = MARKETING_NAV.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain("/marketing/social");
    expect(hrefs).toContain("/marketing/social/calendar");
    expect(hrefs).toContain("/marketing/social/posts");
    expect(hrefs).toContain("/marketing/social/create");
    expect(hrefs).toContain("/marketing/social/analytics");
    expect(hrefs).toContain("/marketing/campaigns");
    expect(hrefs).toContain("/marketing/audience");
    expect(hrefs).toContain("/marketing/social/insights");
    expect(hrefs).toContain("/marketing/social/media");
    expect(hrefs).toContain("/marketing/integrations");
    expect(hrefs).toContain("/marketing/settings");
    expect(hrefs).toContain("/marketing");
  });
});