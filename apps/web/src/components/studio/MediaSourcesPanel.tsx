"use client";

import { useEffect, useState } from "react";
import { FolderPlus, RefreshCw, Trash2 } from "lucide-react";

import type { StudioScanJob } from "@founder-os/studio";

import type { StudioDirectoryPublic } from "@/lib/studio/client-api";
import {
  getScanStatus,
  listDirectories,
  pickMediaFolder,
  registerDirectory,
  removeDirectory,
  scanMedia,
} from "@/lib/studio/client-api";

import { EmptyState } from "./EmptyState";

export function MediaSourcesPanel({
  open,
  onClose,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [directories, setDirectories] = useState<StudioDirectoryPublic[]>([]);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<StudioScanJob | null>(null);

  useEffect(() => {
    if (!open) return;
    void listDirectories().then(({ directories: d }) => setDirectories(d));
  }, [open]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed" || job.status === "cancelled") return;
    const t = setInterval(() => {
      void getScanStatus(job.id).then(({ job: next }) => {
        if (next) setJob(next);
        if (next && ["completed", "failed", "cancelled"].includes(next.status)) {
          onUpdated?.();
          void listDirectories().then(({ directories: d }) => setDirectories(d));
        }
      });
    }, 800);
    return () => clearInterval(t);
  }, [job, onUpdated]);

  if (!open) return null;

  async function addFromPicker() {
    setBusy(true);
    setError(null);
    try {
      const picked = await pickMediaFolder();
      if (picked.cancelled) return;
      if (picked.error) throw new Error(picked.error);
      if (!picked.path) throw new Error("No folder selected.");
      const { directory, scanJobId } = await registerDirectory({ path: picked.path, scan: true });
      setDirectories((prev) => [...prev.filter((d) => d.id !== directory.id), directory]);
      if (scanJobId) {
        const { job: j } = await getScanStatus(scanJobId);
        setJob(j);
      }
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add folder.");
    } finally {
      setBusy(false);
    }
  }

  async function addFromPath() {
    setBusy(true);
    setError(null);
    try {
      const { directory, scanJobId } = await registerDirectory({ path, scan: true });
      setDirectories((prev) => [...prev, directory]);
      setPath("");
      if (scanJobId) {
        const { job: j } = await getScanStatus(scanJobId);
        setJob(j);
      }
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not authorize directory.");
    } finally {
      setBusy(false);
    }
  }

  async function scanFolder(directoryId: string) {
    setBusy(true);
    setError(null);
    try {
      const { jobId } = await scanMedia({ directoryId });
      if (jobId) {
        const { job: j } = await getScanStatus(jobId);
        setJob(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function scanAll() {
    setBusy(true);
    setError(null);
    try {
      const { jobId } = await scanMedia({});
      if (jobId) {
        const { job: j } = await getScanStatus(jobId);
        setJob(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await removeDirectory(id);
    setDirectories((prev) => prev.filter((d) => d.id !== id));
    onUpdated?.();
  }

  const progressPct =
    job && job.totalFiles > 0 ? Math.round((job.processed / job.totalFiles) * 100) : job?.status === "running" ? 0 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="studio-panel max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Media sources</h2>
            <p className="mt-1 text-sm text-[var(--studio-text-tertiary)]">
              Authorize folders on this PC. Footage stays in place — only metadata is stored locally.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[var(--studio-text-tertiary)] hover:text-white">
            Close
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void addFromPicker()}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          <FolderPlus className="h-4 w-4" />
          Add Media Folder
        </button>
        <p className="mb-3 text-center text-[10px] text-[var(--studio-text-tertiary)]">
          Opens the Windows folder picker when running locally on this machine.
        </p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addFromPath();
          }}
        >
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Or paste path: D:\Footage\Reels"
            className="min-w-0 flex-1 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !path.trim()}
            className="rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] px-3 py-2 text-sm disabled:opacity-40"
          >
            Add
          </button>
        </form>

        {job ? (
          <div className="mt-4 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-[var(--studio-text-secondary)]">
                {job.status === "running" ? "Indexing…" : `Scan ${job.status}`}
              </span>
              {progressPct != null ? <span className="tabular-nums font-medium">{progressPct}%</span> : null}
            </div>
            {progressPct != null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--studio-bg-3)]">
                <div
                  className="h-full rounded-full bg-[var(--studio-accent)] transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}
            {job.currentPath ? (
              <p className="mt-1 truncate font-mono text-[10px] text-[var(--studio-text-tertiary)]">{job.currentPath}</p>
            ) : null}
            <p className="mt-2 text-[var(--studio-text-tertiary)]">
              {job.processed}/{job.totalFiles} processed · +{job.added} new · {job.failed} failed · {job.removed} offline
            </p>
            {job.status === "running" ? (
              <button
                type="button"
                className="mt-2 text-[var(--studio-danger)] underline"
                onClick={() => void scanMedia({ cancelJobId: job.id })}
              >
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-[var(--studio-danger)]">{error}</p> : null}

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--studio-text-tertiary)]">
            Authorized folders
          </h3>
          <button
            type="button"
            disabled={busy || directories.length === 0}
            onClick={() => void scanAll()}
            className="inline-flex items-center gap-1 text-xs text-[var(--studio-accent)] disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            Rescan all
          </button>
        </div>

        <ul className="mt-2 space-y-2">
          {directories.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.label}</p>
                <p className="truncate text-[10px] text-[var(--studio-text-tertiary)]">
                  {d.rootLabel}
                  {d.inaccessible ? " · unavailable" : ""}
                  {d.lastScannedAt ? ` · scanned ${new Date(d.lastScannedAt).toLocaleString()}` : ""}
                </p>
              </div>
              <DirectoryActions directoryId={d.id} busy={busy} onRescan={() => void scanFolder(d.id)} onRemove={() => void remove(d.id)} />
            </li>
          ))}
        </ul>

        {directories.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No folders connected"
              description="Add a folder with iPhone transfers or screen recordings to start indexing."
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DirectoryActions({
  directoryId,
  busy,
  onRescan,
  onRemove,
}: {
  directoryId: string;
  busy: boolean;
  onRescan: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        disabled={busy}
        className="rounded p-1 text-[var(--studio-text-tertiary)] hover:text-[var(--studio-accent)] disabled:opacity-40"
        onClick={onRescan}
        aria-label={`Rescan folder ${directoryId}`}
        title="Rescan this folder"
      >
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      </button>
      <button
        type="button"
        className="rounded p-1 text-[var(--studio-text-tertiary)] hover:text-[var(--studio-danger)]"
        onClick={onRemove}
        aria-label="Remove folder"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
