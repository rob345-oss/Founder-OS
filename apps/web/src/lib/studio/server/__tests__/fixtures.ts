import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(command, ["-version"], { windowsHide: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

export async function ensureTinyMp4(outputPath: string): Promise<boolean> {
  const hasFfmpeg = await commandExists("ffmpeg");
  if (!hasFfmpeg) return false;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  return new Promise((resolve) => {
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=320x240:d=0.4",
      "-c:v",
      "libx264",
      "-t",
      "0.4",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args, { windowsHide: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0 && fs.existsSync(outputPath)));
  });
}

export function writeTinyPng(filePath: string): void {
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(pngBase64, "base64"));
}
