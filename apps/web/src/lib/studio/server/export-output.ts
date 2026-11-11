import fs from "node:fs";
import path from "node:path";

import { sanitizeExportFileName } from "@founder-os/studio";

import { studioExportTempDir } from "./data-dir";
import { isPathInsideRoot, safeRealpath, validateDirectoryPath } from "./paths";

export function validateExportDestination(
  outputDirInput: string,
  fileNameInput: string,
  overwrite: boolean,
): { ok: true; outputDir: string; fileName: string; outputPath: string } | { ok: false; error: string } {
  const dirValidated = validateDirectoryPath(outputDirInput);
  if (!dirValidated.ok) return dirValidated;
  const fileName = sanitizeExportFileName(fileNameInput);
  const outputPath = path.join(dirValidated.path, fileName);
  if (!isPathInsideRoot(dirValidated.path, outputPath)) {
    return { ok: false, error: "Invalid output file path." };
  }
  if (fs.existsSync(outputPath) && !overwrite) {
    return { ok: false, error: "Output file already exists. Enable overwrite or choose another name." };
  }
  return { ok: true, outputDir: dirValidated.path, fileName, outputPath: safeRealpath(outputPath) };
}

export function tempExportPath(jobId: string): string {
  const safeId = jobId.replace(/[^a-zA-Z0-9-]/g, "_");
  return path.join(studioExportTempDir(), `${safeId}.part.mp4`);
}

export function safeDeleteFile(absolutePath: string | null | undefined): void {
  if (!absolutePath) return;
  try {
    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  } catch {
    /* ignore */
  }
}
