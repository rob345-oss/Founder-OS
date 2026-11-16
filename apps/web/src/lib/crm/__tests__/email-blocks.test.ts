import { describe, expect, it } from "vitest";

import { defaultEmailBlocks, renderBlocksToHtml, renderBlocksToText } from "../email/blocks";
import { applyPersonalization } from "../email/personalize";

describe("email blocks", () => {
  it("renders responsive html and plain text", () => {
    const blocks = defaultEmailBlocks("en");
    const html = renderBlocksToHtml(blocks);
    const text = renderBlocksToText(blocks);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Titanium Guardian");
    expect(text).toContain("Hello, {{first_name}}");
  });

  it("personalizes with safe fallbacks", () => {
    const subject = applyPersonalization("Hi {{first_name}} from {{company_name}}", {});
    expect(subject).toBe("Hi there from your organization");
  });
});