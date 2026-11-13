import { describe, expect, it } from "vitest";

import { normalizeEmail } from "../normalize";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane@Example.COM ")).toBe("jane@example.com");
  });
});
