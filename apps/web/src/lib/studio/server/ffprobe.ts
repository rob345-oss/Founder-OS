import { spawn } from "node:child_process";

export type VideoProbe = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  codec: string | null;
};

export async function probeVideoFile(filePath: string): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,avg_frame_rate,codec_name",
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
          streams?: { width?: number; height?: number; avg_frame_rate?: string; codec_name?: string }[];
          format?: { duration?: string };
        };
        const stream = parsed.streams?.[0];
        const duration = parsed.format?.duration ? Number(parsed.format.duration) : null;
        resolve({
          durationSeconds: Number.isFinite(duration) ? duration : null,
          width: stream?.width ?? null,
          height: stream?.height ?? null,
          frameRate: parseFrameRate(stream?.avg_frame_rate),
          codec: stream?.codec_name ?? null,
        });
      } catch {
        resolve(emptyProbe());
      }
    });
  });
}

function parseFrameRate(value?: string): number | null {
  if (!value || value === "0/0") return null;
  const [num, den] = value.split("/").map(Number);
  if (!den || !Number.isFinite(num) || !Number.isFinite(den)) return null;
  const fps = num / den;
  return Number.isFinite(fps) ? Math.round(fps * 100) / 100 : null;
}

function emptyProbe(): VideoProbe {
  return { durationSeconds: null, width: null, height: null, frameRate: null, codec: null };
}

export async function probeHasAudio(filePath: string, ffprobePath = "ffprobe"): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "csv=p=0",
      filePath,
    ];
    const proc = spawn(ffprobePath, args, { windowsHide: true, shell: false });
    let out = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0 && out.trim().toLowerCase() === "audio"));
  });
}

export async function probeOutputFile(
  filePath: string,
  ffprobePath = "ffprobe",
): Promise<{ durationSeconds: number | null; sizeBytes: number | null }> {
  return new Promise((resolve) => {
    const args = ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", filePath];
    const proc = spawn(ffprobePath, args, { windowsHide: true, shell: false });
    let out = "";
    proc.on("error", () => resolve({ durationSeconds: null, sizeBytes: null }));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({ durationSeconds: null, sizeBytes: null });
        return;
      }
      try {
        const parsed = JSON.parse(out) as { format?: { duration?: string; size?: string } };
        const d = parsed.format?.duration ? Number(parsed.format.duration) : null;
        const size = parsed.format?.size ? Number(parsed.format.size) : null;
        resolve({
          durationSeconds: Number.isFinite(d) ? d : null,
          sizeBytes: Number.isFinite(size) ? size : null,
        });
      } catch {
        resolve({ durationSeconds: null, sizeBytes: null });
      }
    });
  });
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
