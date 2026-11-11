import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";

import { buildFilterComplex, type ExportRenderPlan } from "@founder-os/studio";

import { probeOutputFile } from "./ffprobe";
import type { FfmpegBinaries } from "./ffmpeg-bin";
import { safeDeleteFile, tempExportPath } from "./export-output";
import { getExportJob, updateExportJob } from "./export-repository";

export function buildFfmpegArgs(
  plan: ExportRenderPlan,
  bins: FfmpegBinaries,
  tempOutput: string,
): string[] {
  const filter = buildFilterComplex(plan);
  const args: string[] = ["-hide_banner", "-loglevel", "error", "-nostats"];
  for (const seg of plan.segments) {
    args.push("-i", seg.sourcePath!);
  }
  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[vcat]",
    "-map",
    "[acat]",
    "-c:v",
    plan.preset.videoCodec,
    "-preset",
    "medium",
    "-crf",
    String(plan.crf),
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(plan.preset.frameRate),
    "-c:a",
    plan.preset.audioCodec,
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-progress",
    "pipe:1",
    "-y",
    tempOutput,
  );
  return args;
}

type ProgressState = {
  outTimeMs: number | null;
  durationUs: number;
};

function parseProgressLine(line: string, state: ProgressState): void {
  const trimmed = line.trim();
  if (trimmed.startsWith("out_time_ms=")) {
    const v = Number(trimmed.slice("out_time_ms=".length));
    if (Number.isFinite(v)) state.outTimeMs = v;
  }
  if (trimmed.startsWith("duration=")) {
    const v = Number(trimmed.slice("duration=".length));
    if (Number.isFinite(v)) state.durationUs = v * 1_000_000;
  }
}

export type RunningExport = {
  jobId: string;
  proc: ChildProcess;
};

let activeExport: RunningExport | null = null;

export function getActiveExportJobId(): string | null {
  return activeExport?.jobId ?? null;
}

export async function runExportJob(
  jobId: string,
  plan: ExportRenderPlan,
  bins: FfmpegBinaries,
  finalOutputPath: string,
): Promise<void> {
  if (activeExport) {
    throw new Error("Another export is already running.");
  }

  const tempOutput = tempExportPath(jobId);
  safeDeleteFile(tempOutput);
  updateExportJob(jobId, {
    status: "preparing",
    startedAt: new Date().toISOString(),
    progress: 0,
    progressLabel: "Preparing FFmpeg…",
    tempOutputPath: tempOutput,
    error: null,
  });

  const args = buildFfmpegArgs(plan, bins, tempOutput);
  const proc = spawn(bins.ffmpeg, args, { windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  activeExport = { jobId, proc };

  const durationUs = Math.max(1, plan.totalDurationSeconds * 1_000_000);
  const state: ProgressState = { outTimeMs: null, durationUs };
  let stderr = "";
  let buf = "";

  updateExportJob(jobId, { status: "rendering", progressLabel: "Rendering…" });

  const cancelledCheck = setInterval(() => {
    const job = getExportJob(jobId);
    if (job?.cancelRequested && activeExport?.jobId === jobId) {
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 4000);
    }
  }, 500);

  await new Promise<void>((resolve, reject) => {
    proc.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        parseProgressLine(line, state);
        if (state.outTimeMs != null) {
          const progress = Math.min(0.98, state.outTimeMs / durationUs);
          updateExportJob(jobId, {
            progress,
            progressLabel: `Rendering (${Math.round(progress * 100)}%)`,
          });
        }
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 16_000) stderr = stderr.slice(-16_000);
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      clearInterval(cancelledCheck);
      activeExport = null;
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
    });
  }).catch((err) => {
    clearInterval(cancelledCheck);
    activeExport = null;
    safeDeleteFile(tempOutput);
    const job = getExportJob(jobId);
    if (job?.cancelRequested) {
      updateExportJob(jobId, {
        status: "cancelled",
        error: "Export cancelled.",
        finishedAt: new Date().toISOString(),
        progressLabel: null,
      });
      return;
    }
    updateExportJob(jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: new Date().toISOString(),
      progressLabel: null,
    });
  });

  const after = getExportJob(jobId);
  if (!after || after.status === "failed" || after.status === "cancelled") return;

  updateExportJob(jobId, { status: "finalizing", progress: 0.99, progressLabel: "Finalizing…" });

  if (fs.existsSync(finalOutputPath)) {
    safeDeleteFile(finalOutputPath);
  }
  fs.renameSync(tempOutput, finalOutputPath);

  const probed = await probeOutputFile(finalOutputPath, bins.ffprobe);
  const stat = fs.statSync(finalOutputPath);

  updateExportJob(jobId, {
    status: "completed",
    outputPath: finalOutputPath,
    progress: 1,
    progressLabel: "Completed",
    finishedAt: new Date().toISOString(),
    outputDurationSeconds: probed.durationSeconds,
    outputSizeBytes: probed.sizeBytes ?? stat.size,
    tempOutputPath: null,
    error: null,
  });
}

export function cancelActiveExport(): void {
  if (!activeExport) return;
  updateExportJob(activeExport.jobId, { cancelRequested: true });
  activeExport.proc.kill("SIGTERM");
}
