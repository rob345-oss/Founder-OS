"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FolderOpen, Play } from "lucide-react";

import { STUDIO_EXPORT_PRESETS, type StudioExportJob } from "@founder-os/studio";

import {
  exportStreamUrl,
  listExportJobs,
  revealExportInExplorer,
} from "@/lib/studio/client-api";
import { formatDuration, formatFileSize, formatRelativeTime } from "@/lib/studio/format";

export function ExportsHistory() {
  const [jobs, setJobs] = useState<StudioExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  function refresh() {
    void listExportJobs()
      .then(({ jobs: list }) => setJobs(list))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="px-8 py-6">
      {loading ? <p className="text-sm text-[var(--studio-text-tertiary)]">Loading exports…</p> : null}
      <div className="overflow-hidden rounded-[var(--studio-radius-md)] border border-[var(--studio-border)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)] text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">Preset</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Progress</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Output</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const preset = STUDIO_EXPORT_PRESETS[job.presetId];
              const canPlay = job.status === "completed";
              const pct =
                job.status === "completed"
                  ? 100
                  : job.progress > 0
                    ? Math.round(job.progress * 100)
                    : job.status === "queued"
                      ? 0
                      : null;
              return (
                <tr key={job.id} className="border-b border-[var(--studio-border)]/60">
                  <td className="px-3 py-2 text-[var(--studio-text-primary)]">{job.settings.fileName}</td>
                  <td className="px-3 py-2">{job.projectTitle}</td>
                  <td className="px-3 py-2">{preset?.label ?? job.presetId}</td>
                  <td className="px-3 py-2 capitalize">{job.status}</td>
                  <td className="px-3 py-2">{pct == null ? "—" : `${pct}%`}</td>
                  <td className="px-3 py-2">{formatRelativeTime(job.createdAt)}</td>
                  <td className="px-3 py-2 text-[var(--studio-text-secondary)]">
                    {job.outputSizeBytes != null ? formatFileSize(job.outputSizeBytes) : "—"}
                    {job.outputDurationSeconds != null ? ` · ${formatDuration(job.outputDurationSeconds)}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={!canPlay}
                        title="Play"
                        onClick={() => setPreviewId(job.id)}
                        className="rounded border border-[var(--studio-border)] p-1 disabled:opacity-30"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!canPlay}
                        title="Reveal in Explorer"
                        onClick={() => void revealExportInExplorer(job.id)}
                        className="rounded border border-[var(--studio-border)] p-1 disabled:opacity-30"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </button>
                      {canPlay ? (
                        <a
                          href={exportStreamUrl(job.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-[var(--studio-border)] p-1"
                          title="Open stream"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && jobs.length === 0 ? (
          <p className="p-6 text-sm text-[var(--studio-text-tertiary)]">No exports yet. Render a project from the editor.</p>
        ) : null}
      </div>

      {previewId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-3xl rounded border border-[var(--studio-border)] bg-black p-2">
            <video src={exportStreamUrl(previewId)} controls autoPlay className="max-h-[70vh] w-full" />
            <button
              type="button"
              className="mt-2 text-xs text-white/80"
              onClick={() => setPreviewId(null)}
            >
              Close preview
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
