import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("export jobs persistence", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fos-export-db-"));
    process.env.FOUNDER_OS_STUDIO_DATA_DIR = dataDir;
    vi.resetModules();
  });

  afterEach(async () => {
    const { closeStudioDb } = await import("../db");
    closeStudioDb();
    delete process.env.FOUNDER_OS_STUDIO_DATA_DIR;
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* wal */
    }
  });

  it("marks interrupted jobs failed on reconcile", async () => {
    const { insertExportJob, updateExportJob, reconcileInterruptedExportJobs, getExportJob } = await import(
      "../export-repository"
    );
    const { insertProject, newProjectId } = await import("../repository");
    const projectId = newProjectId();
    insertProject({
      id: projectId,
      title: "P",
      status: "editing",
      targetPlatform: "tiktok",
      aspectRatio: "9:16",
      thumbnailMediaId: null,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const job = insertExportJob({
      id: "job-1",
      projectId,
      projectTitle: "P",
      presetId: "vertical_social",
      settings: {
        presetId: "vertical_social",
        qualityId: "standard",
        fileName: "out.mp4",
        outputDir: dataDir,
        overwrite: true,
      },
      outputDir: dataDir,
      fileName: "out.mp4",
    });
    updateExportJob(job.id, { status: "rendering" });
    const n = reconcileInterruptedExportJobs();
    expect(n).toBe(1);
    expect(getExportJob(job.id)?.status).toBe("failed");
  });
});
