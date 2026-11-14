import { spawn } from "node:child_process";

/**
 * Opens a native Windows folder browser dialog via PowerShell + WinForms.
 * Returns null when cancelled or unsupported.
 */
export function pickWindowsFolder(): Promise<string | null> {
  if (process.platform !== "win32") {
    return Promise.resolve(null);
  }

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Choose a media folder for Founder OS Studio'",
    "$dialog.ShowNewFolderButton = $true",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.SelectedPath",
    "}",
  ].join("; ");

  return new Promise((resolve) => {
    const proc = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-STA", "-Command", script],
      { windowsHide: true },
    );
    let out = "";
    let _err = "";
    proc.stdout.on("data", (c: Buffer) => {
      out += c.toString();
    });
    proc.stderr.on("data", (c: Buffer) => {
      _err += c.toString();
    });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const picked = out.trim().split(/\r?\n/).filter(Boolean).pop()?.trim();
      resolve(picked || null);
    });
  });
}
