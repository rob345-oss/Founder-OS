import { afterEach, describe, expect, it } from "vitest";

import { assertPublishNotArmedForExternalDispatch, isMarketingPublishArmed } from "@/lib/marketing/server/publish-guard";

describe("marketing publish guard", () => {
  afterEach(() => {
    delete process.env.MARKETING_PUBLISH_ARMED;
  });

  it("defaults to disarmed", () => {
    expect(isMarketingPublishArmed()).toBe(false);
    expect(assertPublishNotArmedForExternalDispatch().ok).toBe(true);
  });

  it("detects armed env", () => {
    process.env.MARKETING_PUBLISH_ARMED = "true";
    expect(isMarketingPublishArmed()).toBe(true);
    expect(assertPublishNotArmedForExternalDispatch().ok).toBe(false);
  });
});