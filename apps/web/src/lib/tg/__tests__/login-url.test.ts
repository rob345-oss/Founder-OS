import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTgLoginUrl, sanitizeTgReturnPath } from "../login-url";

describe("sanitizeTgReturnPath", () => {
  it("allows marketing and crm subtrees", () => {
    expect(sanitizeTgReturnPath("/marketing")).toBe("/marketing");
    expect(sanitizeTgReturnPath("/marketing/growth")).toBe("/marketing/growth");
    expect(sanitizeTgReturnPath("/crm/waitlist")).toBe("/crm/waitlist");
  });

  it("rejects open redirects", () => {
    expect(sanitizeTgReturnPath("//evil.test")).toBe("/dashboard");
    expect(sanitizeTgReturnPath("https://evil.test")).toBe("/dashboard");
    expect(sanitizeTgReturnPath("/off-site")).toBe("/dashboard");
  });
});

describe("buildTgLoginUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses staging origin on deployed builds without local env", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");
    const url = buildTgLoginUrl("/marketing", "founder-os-web-blush.vercel.app");
    expect(url).toBe("https://staging.titaniumguardian.com/login?next=%2Fmarketing");
  });

  it("uses production origin when hostname is titaniumguardian.com", () => {
    const url = buildTgLoginUrl("/marketing", "titaniumguardian.com");
    expect(url).toBe("https://titaniumguardian.com/login?next=%2Fmarketing");
  });

  it("honors NEXT_PUBLIC_TG_APP_ORIGIN override", () => {
    vi.stubEnv("NEXT_PUBLIC_TG_APP_ORIGIN", "https://staging.titaniumguardian.com");
    const url = buildTgLoginUrl("/crm");
    expect(url).toBe("https://staging.titaniumguardian.com/login?next=%2Fcrm");
  });
});