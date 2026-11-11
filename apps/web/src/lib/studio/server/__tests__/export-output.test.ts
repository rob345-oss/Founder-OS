import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { validateExportDestination } from "../export-output";

describe("export output paths", () => {
  let dir: string;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects path traversal in file names", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fos-export-"));
    const v = validateExportDestination(dir, "../../evil.mp4", false);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.outputPath.startsWith(dir)).toBe(true);
      expect(v.fileName).toBe("evil.mp4");
    }
  });

  it("blocks overwrite without flag", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fos-export-"));
    const file = path.join(dir, "out.mp4");
    fs.writeFileSync(file, "x");
    const v = validateExportDestination(dir, "out.mp4", false);
    expect(v.ok).toBe(false);
  });
});
