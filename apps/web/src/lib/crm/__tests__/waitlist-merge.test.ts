import { describe, expect, it } from "vitest";

import {
  mergeClassifications,
  mergeContactSource,
  mergePipelineStage,
  mergeRelationshipStatus,
  mergeTags,
  waitlistLeadSource,
} from "../waitlist-merge";

describe("waitlist merge helpers", () => {
  it("merges classifications without duplicates", () => {
    expect(
      mergeClassifications(["general_contact", "waitlist_candidate"], ["waitlist_candidate", "pilot_candidate"]),
    ).toEqual(["general_contact", "waitlist_candidate", "pilot_candidate"]);
  });

  it("merges tags case-insensitively", () => {
    expect(mergeTags(["Waitlist"], ["waitlist", "beta-interest"])).toEqual(["Waitlist", "beta-interest"]);
  });

  it("keeps the more advanced pipeline stage", () => {
    expect(mergePipelineStage("new_lead", "qualified")).toBe("qualified");
    expect(mergePipelineStage("converted", "interested")).toBe("converted");
  });

  it("keeps the more advanced relationship status", () => {
    expect(mergeRelationshipStatus("new", "interested")).toBe("interested");
    expect(mergeRelationshipStatus("converted", "contacted")).toBe("converted");
  });

  it("preserves manual source over waitlist", () => {
    expect(mergeContactSource("manual", waitlistLeadSource)).toBe("manual");
    expect(mergeContactSource(null, waitlistLeadSource)).toBe("waitlist");
  });
});