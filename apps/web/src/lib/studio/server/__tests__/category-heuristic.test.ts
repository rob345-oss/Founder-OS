import { describe, expect, it } from "vitest";

import { inferCategoryFromRelativePath } from "../category-heuristic";

describe("category heuristic", () => {
  it("maps Titanium Guardian folder names", () => {
    expect(
      inferCategoryFromRelativePath("01 - Original Media/Iphone/Hooks/Hook_01 - 18Build Company/clip.mov"),
    ).toBe("hook");
    expect(
      inferCategoryFromRelativePath("01 - Original Media/Iphone/CTAs/CTA_01 - BuildingVisitTG/take.mov"),
    ).toBe("cta");
  });
});
