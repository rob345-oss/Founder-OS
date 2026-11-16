import { describe, expect, it } from "vitest";

import { buildTrackedUrl } from "@/lib/marketing/server/social-utm";

describe("social utm builder", () => {
  it("appends UTM params", () => {
    const url = buildTrackedUrl({
      destinationUrl: "https://titaniumguardian.com/waitlist",
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "waitlist-launch",
      utmContent: "post-1",
    });
    expect(url).toContain("utm_source=linkedin");
    expect(url).toContain("utm_medium=social");
    expect(url).toContain("utm_campaign=waitlist-launch");
    expect(url).toContain("utm_content=post-1");
  });
});