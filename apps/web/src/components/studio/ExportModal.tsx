"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  STUDIO_EXPORT_PRESETS,
  STUDIO_EXPORT_QUALITY_IDS,
  type StudioExportJob,
  type StudioExportPresetId,
  type StudioExportQualityId,
} from "@founder-os/studio";

import {
  cancelExportJob,
  fetchExportJob,
  fetchFfmpegStatus,
  pickExportDestination,
  startExport,
} from "@/lib/studio/client-api";
import { formatDuration } from "@/lib/studio/format";

export function ExportModal({
  open,
  onClose,
  projectId,
  projectTitle,
  estimatedDurationSeconds,
  canExport,
  blockReason,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectTitle: string;
  estimatedDurationSeconds: number;
  canExport: boolean;
  blockReason?: string;
}) {
  const [presetId, setPresetId] = useState<StudioExportPresetId>("vertical_social");
  const [qualityId, setQualityId] = useState<StudioExportQualityId>("standard");
  const [fileName, setFileName] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [ffmpegOk, setFfmpegOk] = useState<boolean | null>(null);
  const [ffmpegHint, setFfmpegHint] = useState("");
  const [activeJob, setActiveJob] = useState<StudioExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = projectTitle.replace(/[<>:"/\\|?*]+/g, "_").slice(0, 80) || "export";
    setFileName(`${base}.mp4`);
    setError(null);
    setActiveJob(null);
    void fetchFfmpegStatus().then((s) => {
      setFfmpegOk(s.available);
      setFfmpegHint(s.hint);
    });
  }, [open, projectTitle]);

  const pollJob = useCallback((jobId: string) => {
    const tick = () => {
      void fetchExportJob(jobId).then(({ job }) => {
        setActiveJob(job);
        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") return;
        window.setTimeout(tick, 800);
      });
    };
    tick();
  }, []);

  async function onStart() {
    if (!projectId || !canExport) return;
    setError(null);
    try {
      const preset = STUDIO_EXPORT_PRESETS[presetId];
      const { job } = await startExport({
        projectId,
        presetId,
        settings: {
          presetId,
          qualityId,
          fileName,
          outputDir,
          overwrite,
        },
      });
      setActiveJob(job);
      pollJob(job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed to start.");
    }
  }

  if (!open) return null;

  const preset = STUDIO_EXPORT_PRESETS[presetId];
  const busy =
    activeJob &&
    (activeJob.status === "queued" ||
      activeJob.status === "preparing" ||
      activeJob.status === "rendering" ||
      activeJob.status === "finalizing");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Export video</h2>
            <p className="text-[11px] text-[var(--studio-text-tertiary)]">{projectTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-hover)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 text-xs">
          {ffmpegOk === false ? (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-100">{ffmpegHint}</p>
          ) : null}
          {blockReason ? <p className="text-amber-200">{blockReason}</p> : null}
          {error ? <p className="text-red-300">{error}</p> : null}

          <label className="block">
            <span className="text-[var(--studio-text-tertiary)]">Filename</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5"
              disabled={Boolean(busy)}
            />
          </label>

          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-[var(--studio-text-tertiary)]">Destination</span>
              <input
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="Default: Studio exports folder"
                className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5"
                disabled={Boolean(busy)}
              />
            </label>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void pickExportDestination().then((r) => r.path && setOutputDir(r.path))}
              className="mt-5 shrink-0 rounded border border-[var(--studio-border)] px-2 py-1.5"
            >
              Browse…
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[var(--studio-text-tertiary)]">Preset</span>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value as StudioExportPresetId)}
                className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5"
                disabled={Boolean(busy)}
              >
                {Object.values(STUDIO_EXPORT_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[var(--studio-text-tertiary)]">Quality</span>
              <select
                value={qualityId}
                onChange={(e) => setQualityId(e.target.value as StudioExportQualityId)}
                className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5"
                disabled={Boolean(busy)}
              >
                {STUDIO_EXPORT_QUALITY_IDS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-0)] p-2 text-[var(--studio-text-secondary)]">
            <div>
              <dt className="text-[var(--studio-text-tertiary)]">Resolution</dt>
              <dd>
                {preset.width}×{preset.height} ({preset.aspectRatio})
              </dd>
            </div>
            <div>
              <dt className="text-[var(--studio-text-tertiary)]">FPS</dt>
              <dd>{preset.frameRate}</dd>
            </div>
            <div>
              <dt className="text-[var(--studio-text-tertiary)]">Est. duration</dt>
              <dd>{formatDuration(estimatedDurationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-[var(--studio-text-tertiary)]">Fit</dt>
              <dd>Letterbox / pillarbox (no crop)</dd>
            </div>
          </dl>

          <label className="flex items-center gap-2 text-[var(--studio-text-tertiary)]">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} disabled={Boolean(busy)} />
            Overwrite existing file
          </label>

          {activeJob ? (
            <div className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-3">
              <div className="flex items-center justify-between">
                <span className="capitalize text-[var(--studio-text-primary)]">{activeJob.status}</span>
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-[var(--studio-accent)]" /> : null}
              </div>
              {activeJob.progressLabel ? (
                <p className="mt-1 text-[var(--studio-text-tertiary)]">{activeJob.progressLabel}</p>
              ) : null}
              {busy ? (
                <ExportProgressBar value={activeJob.progress} />
              ) : null}
              {activeJob.error ? <p className="mt-2 text-red-300">{activeJob.error}</p> : null}
              {busy ? (
                <button
                  type="button"
                  className="mt-2 text-[var(--studio-text-secondary)] underline"
                  onClick={() => void cancelExportJob(activeJob.id).then(({ job }) => setActiveJob(job))}
                >
                  Cancel export
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--studio-border)] px-4 py-3">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-xs text-[var(--studio-text-secondary)]">
            {activeJob?.status === "completed" ? "Done" : "Close"}
          </button>
          {!busy ? (
            <button
              type="button"
              disabled={!projectId || !canExport || ffmpegOk === false}
              onClick={() => void onStart()}
              className="rounded bg-[var(--studio-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Start export
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExportProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--studio-bg-0)]">
      <div className="h-full bg-[var(--studio-accent)] transition-all" style={{ width: `${pct}%` }} />
      <p className="mt-1 text-[10px] text-[var(--studio-text-tertiary)]">{pct}%</p>
    </div>
  );
}
