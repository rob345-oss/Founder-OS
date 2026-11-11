import { spawn } from "node:child_process";

import fs from "node:fs";

export type FfmpegBinaries = {
  ffmpeg: string;
  ffprobe: string;
};

function commonWindowsFfmpegPaths(): string[] {
  const paths = ["C:\\ffmpeg\\bin\\ffmpeg.exe", "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"];
  const pf = process.env.ProgramFiles;
  if (pf) paths.push(`${pf}\\ffmpeg\\bin\\ffmpeg.exe`);
  const pfx86 = process.env["ProgramFiles(x86)"];
  if (pfx86) paths.push(`${pfx86}\\ffmpeg\\bin\\ffmpeg.exe`);
  return paths;
}

export function getFfmpegEnvOverrides(): FfmpegBinaries | null {
  const ffmpeg = process.env.FFMPEG_PATH?.trim();
  const ffprobe = process.env.FFPROBE_PATH?.trim() ?? (ffmpeg ? ffmpeg.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1") : undefined);
  if (!ffmpeg || !ffprobe) return null;
  if (!fs.existsSync(ffmpeg) || !fs.existsSync(ffprobe)) return null;
  return { ffmpeg, ffprobe };
}

export function probeBinary(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(binary, ["-version"], { windowsHide: true, shell: false });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

export async function locateFfmpegBinaries(): Promise<FfmpegBinaries | null> {
  const fromEnv = getFfmpegEnvOverrides();
  if (fromEnv && (await probeBinary(fromEnv.ffmpeg)) && (await probeBinary(fromEnv.ffprobe))) {
    return fromEnv;
  }

  const ffmpegPath = await which("ffmpeg");
  const ffprobePath = await which("ffprobe");
  if (ffmpegPath && ffprobePath) {
    return { ffmpeg: ffmpegPath, ffprobe: ffprobePath };
  }

  for (const candidate of commonWindowsFfmpegPaths()) {
    const ffprobe = candidate.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
    if (fs.existsSync(candidate) && fs.existsSync(ffprobe)) {
      if ((await probeBinary(candidate)) && (await probeBinary(ffprobe))) {
        return { ffmpeg: candidate, ffprobe };
      }
    }
  }
  return null;
}

function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const exe = process.platform === "win32" ? "where.exe" : "which";
    const arg = process.platform === "win32" ? cmd : cmd;
    const proc = spawn(exe, [arg], { windowsHide: true, shell: false });
    let out = "";
    proc.stdout.on("data", (c: Buffer) => {
      out += c.toString();
    });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const line = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      resolve(line ?? null);
    });
  });
}

export async function getFfmpegStatus(): Promise<{
  available: boolean;
  ffmpeg: string | null;
  ffprobe: string | null;
  hint: string;
}> {
  const bins = await locateFfmpegBinaries();
  if (!bins) {
    return {
      available: false,
      ffmpeg: null,
      ffprobe: null,
      hint:
        "Install FFmpeg and add it to PATH, or set FFMPEG_PATH and FFPROBE_PATH in apps/web/.env.local (Windows: winget install Gyan.FFmpeg).",
    };
  }
  return { available: true, ffmpeg: bins.ffmpeg, ffprobe: bins.ffprobe, hint: "" };
}
