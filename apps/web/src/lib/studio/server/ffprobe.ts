import { spawn } from "node:child_process";

export type VideoProbe = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
};

export async function probeVideoFile(filePath: string): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ];
    const proc = spawn("ffprobe", args, { windowsHide: true });
    let out = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on("error", () => resolve(emptyProbe()));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(emptyProbe());
        return;
      }
      try {
        const parsed = JSON.parse(out) as {
          streams?: { width?: number; height?: number }[];
          format?: { duration?: string };
        };
        const stream = parsed.streams?.[0];
        const duration = parsed.format?.duration ? Number(parsed.format.duration) : null;
        resolve({
          durationSeconds: Number.isFinite(duration) ? duration : null,
          width: stream?.width ?? null,
          height: stream?.height ?? null,
        });
      } catch {
        resolve(emptyProbe());
      }
    });
  });
}

function emptyProbe(): VideoProbe {
  return { durationSeconds: null, width: null, height: null };
}

export async function extractThumbnail(filePath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      "-y",
      "-ss",
      "00:00:01",
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args, { windowsHide: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}
