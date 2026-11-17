import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Staging must not redirect or externally rewrite /crm while TG hosts app/crm.
 * Marketing is proxied to founder-os-web when app/marketing is absent (see TG vercel.json).
 */
const TG_VERCEL_JSON = path.resolve(
  process.cwd(),
  "../../.tg-ref/frontend/vercel.json"
);
const TG_CRM_APP = path.resolve(process.cwd(), "../../.tg-ref/frontend/app/crm");
const TG_MARKETING_APP = path.resolve(
  process.cwd(),
  "../../.tg-ref/frontend/app/marketing"
);

function isExternalDestination(destination: unknown): boolean {
  return typeof destination === "string" && destination.startsWith("http");
}

describe("staging CRM and marketing routing (senior-cybersecurity-346)", () => {
  it("avoids redirect/rewrite loops for /crm on staging.titaniumguardian.com", () => {
    if (!fs.existsSync(TG_VERCEL_JSON)) {
      return;
    }
    const config = JSON.parse(fs.readFileSync(TG_VERCEL_JSON, "utf8")) as {
      redirects?: Array<{ source?: string; destination?: string; has?: unknown[] }>;
      rewrites?: Array<{ source?: string; destination?: string; has?: unknown[] }>;
    };

    const stagingCrmRedirects = (config.redirects ?? []).filter(
      (r) => typeof r.source === "string" && r.source.replace(/\/:path\*$/, "").startsWith("/crm")
    );
    expect(stagingCrmRedirects).toEqual([]);

    const stagingHost = "staging.titaniumguardian.com";
    const crmNative = fs.existsSync(TG_CRM_APP);
    const stagingCrmRewrites = (config.rewrites ?? []).filter(
      (r) =>
        typeof r.source === "string" &&
        r.source.replace(/\/:path\*$/, "").startsWith("/crm") &&
        r.has?.some(
          (h) =>
            typeof h === "object" &&
            h !== null &&
            "value" in h &&
            (h as { value?: string }).value === stagingHost
        )
    );
    if (crmNative) {
      expect(stagingCrmRewrites).toEqual([]);
    }
  });

  it("proxies /marketing to founder-os-web when embedded app/marketing is removed", () => {
    if (!fs.existsSync(TG_VERCEL_JSON)) {
      return;
    }
    const marketingNative = fs.existsSync(TG_MARKETING_APP);
    const config = JSON.parse(fs.readFileSync(TG_VERCEL_JSON, "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };
    const rewrites = config.rewrites ?? [];

    if (marketingNative) {
      return;
    }

    const marketingRewrite = rewrites.find(
      (r) => r.source === "/marketing" && isExternalDestination(r.destination)
    );
    expect(marketingRewrite?.destination).toMatch(/founder-os-web/);

    const assetsRewrite = rewrites.find(
      (r) =>
        typeof r.source === "string" &&
        r.source.includes("founder-os-assets") &&
        isExternalDestination(r.destination)
    );
    expect(assetsRewrite).toBeDefined();
  });
});