import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { assertSafeRelativePath, isPathInsideRoot, validateDirectoryPath } from "../paths";

describe("studio paths", () => {
  it("rejects path traversal in relative paths", () => {
    expect(() => assertSafeRelativePath("../secret.mp4")).toThrow();
    expect(assertSafeRelativePath("folder/clip.mp4")).toBe("folder/clip.mp4");
  });

  it("validates an existing temp directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-os-studio-"));
  try {
      const result = validateDirectoryPath(dir);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.path).toBeTruthy();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("blocks files outside authorized root", () => {
    const root = path.resolve("C:\\Footage");
    const outside = path.resolve("C:\\Windows");
    expect(isPathInsideRoot(root, outside)).toBe(false);
  });
});
