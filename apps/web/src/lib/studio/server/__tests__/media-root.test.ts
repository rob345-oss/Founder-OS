import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("studio media root", () => {
  const envKey = "FOUNDER_OS_STUDIO_MEDIA_ROOT";
  let tempRoots: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    for (const dir of tempRoots) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* Windows locks */
      }
    }
    tempRoots = [];
    vi.resetModules();
  });

  function makeDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempRoots.push(dir);
    return dir;
  }

  it("allows directories inside the configured media root", async () => {
    const mediaRoot = makeDir("founder-os-media-root-");
    const nested = path.join(mediaRoot, "Hooks");
    fs.mkdirSync(nested);

    vi.stubEnv(envKey, mediaRoot);
    const { validateAuthorizedDirectoryRegistration } = await import("../media-root");
    const result = validateAuthorizedDirectoryRegistration(nested);
    expect(result.ok).toBe(true);
  });

  it("rejects directories outside the configured media root", async () => {
    const mediaRoot = makeDir("founder-os-media-root-");
    const outside = makeDir("founder-os-outside-");

    vi.stubEnv(envKey, mediaRoot);
    const { validateAuthorizedDirectoryRegistration } = await import("../media-root");
    const result = validateAuthorizedDirectoryRegistration(outside);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/inside FOUNDER_OS_STUDIO_MEDIA_ROOT/i);
    }
  });

  it("fails securely when the configured root is missing", async () => {
    const missing = path.join(os.tmpdir(), `founder-os-missing-${Date.now()}`);
    vi.stubEnv(envKey, missing);
    const { getStudioMediaRoot } = await import("../media-root");
    const root = getStudioMediaRoot();
    expect(root.configured).toBe(true);
    if (root.configured) {
      expect("ok" in root && root.ok).toBe(false);
    }
  });

  it("blocks junction escapes outside the media root", async () => {
    if (process.platform !== "win32") return;

    const mediaRoot = makeDir("founder-os-media-root-");
    const outside = makeDir("founder-os-outside-");
    const secretFile = path.join(outside, "secret.txt");
    fs.writeFileSync(secretFile, "do not read");

    const linkPath = path.join(mediaRoot, "escape-link");
    fs.symlinkSync(outside, linkPath, "junction");

    vi.stubEnv(envKey, mediaRoot);
    const { assertWithinStudioMediaRoot, StudioMediaRootError } = await import("../media-root");
    const viaJunction = path.join(linkPath, "secret.txt");
    expect(() => assertWithinStudioMediaRoot(viaJunction, "test_junction")).toThrow(StudioMediaRootError);
  });

  it("blocks resolveMediaAbsolutePath traversal via .. segments", async () => {
    const mediaRoot = makeDir("founder-os-media-root-");
    const nested = path.join(mediaRoot, "nested");
    fs.mkdirSync(nested);

    vi.stubEnv(envKey, mediaRoot);
    const { resolveMediaAbsolutePath } = await import("../paths");
    expect(() => resolveMediaAbsolutePath(nested, "../")).toThrow();
  });
});
