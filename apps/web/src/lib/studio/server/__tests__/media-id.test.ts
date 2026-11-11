import { describe, expect, it } from "vitest";

import { mediaIdForPath } from "../repository";

describe("mediaIdForPath", () => {
  it("is deterministic for the same root and relative path", () => {
    const root = "D:\\Footage";
    const rel = "takes/hook-01.mp4";
    expect(mediaIdForPath(root, rel)).toBe(mediaIdForPath(root, rel));
  });

  it("changes when relative path changes", () => {
    const root = "D:\\Footage";
    expect(mediaIdForPath(root, "a.mp4")).not.toBe(mediaIdForPath(root, "b.mp4"));
  });
});
