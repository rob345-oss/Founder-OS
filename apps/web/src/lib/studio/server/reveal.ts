import { spawn } from "node:child_process";

/**
 * Opens the host file manager and highlights an authorized file path.
 * Never copies paths to the client — caller must already hold a validated absolute path.
 */
export function revealAuthorizedFile(absolutePath: string): Promise<boolean> {
  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const proc = spawn("explorer.exe", [`/select,${absolutePath}`], { windowsHide: true, shell: false });
      proc.on("error", () => resolve(false));
      proc.on("close", () => resolve(true));
    });
  }
  if (process.platform === "darwin") {
    return new Promise((resolve) => {
      const proc = spawn("open", ["-R", absolutePath], { windowsHide: true });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
    });
  }
  return Promise.resolve(false);
}
