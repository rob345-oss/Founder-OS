"use client";

import { useState } from "react";
import { FolderPlus, RefreshCw } from "lucide-react";

import type { StudioDirectoryPublic } from "@/lib/studio/client-api";
import { listDirectories, registerDirectory, scanMedia } from "@/lib/studio/client-api";

import { EmptyState } from "./EmptyState";

export function DirectoryManager({
  initialDirectories,
  onUpdated,
}: {
  initialDirectories: StudioDirectoryPublic[];
  onUpdated?: () => void;
}) {
  const [directories, setDirectories] = useState(initialDirectories);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSummary, setScanSummary] = useState<string | null>(null);

  async function addDirectory() {
    setBusy(true);
    setError(null);
    try {
      const { directory } = await registerDirectory({ path });
      setDirectories((prev) => [...prev, directory]);
      setPath("");
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not authorize directory.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshScan() {
    setBusy(true);
    setError(null);
    setScanSummary(null);
    try {
      const { result } = await scanMedia();
      setScanSummary(`Indexed ${result.total} videos (+${result.added} new, ${result.updated} updated).`);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadDirs() {
    const { directories: dirs } = await listDirectories();
    setDirectories(dirs);
  }

  return (
    <form
      className="studio-panel p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void addDirectory();
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--studio-text-primary)]">Authorized media directories</h3>
          <p className="mt-1 text-xs text-[var(--studio-text-tertiary)]">
            Only folders you add here are scanned. Paths are stored locally on this PC.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || directories.length === 0}
          onClick={() => void refreshScan()}
          className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-3 py-2 text-xs font-medium text-[var(--studio-text-primary)] disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Scan library
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="D:\Footage\Founder-Reels"
          className="min-w-0 flex-1 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm text-[var(--studio-text-primary)]"
        />
        <button
          type="submit"
          disabled={busy || !path.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <FolderPlus className="h-4 w-4" />
          Authorize
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--studio-danger)]">{error}</p> : null}
      {scanSummary ? <p className="mt-3 text-sm text-[var(--studio-success)]">{scanSummary}</p> : null}

      <ul className="mt-5 space-y-2">
        {directories.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-[var(--studio-text-primary)]">{d.label}</p>
              <p className="text-xs text-[var(--studio-text-tertiary)]">
                {d.rootLabel}
                {d.lastScannedAt ? ` · scanned ${new Date(d.lastScannedAt).toLocaleString()}` : " · not scanned yet"}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-[var(--studio-text-tertiary)] underline hover:text-[var(--studio-text-secondary)]"
              onClick={() => void reloadDirs()}
            >
              Refresh
            </button>
          </li>
        ))}
      </ul>

      {directories.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No directories authorized"
            description="Add a folder where you store iPhone transfers or screen recordings to build your local index."
          />
        </div>
      ) : null}
    </form>
  );
}
