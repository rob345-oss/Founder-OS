"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Film, FolderInput, Layers3, Plus, Sparkles, Upload } from "lucide-react";

import { STUDIO_CONTENT_CATEGORIES } from "@founder-os/studio";

import { createProject, fetchStudioOverview, type StudioOverviewPayload } from "@/lib/studio/client-api";

import { CategoryBadge } from "./CategoryBadge";
import { ContentPipeline } from "./ContentPipeline";
import { DirectoryManager } from "./DirectoryManager";
import { MetricCard } from "./MetricCard";
import { ProjectCard } from "./ProjectCard";
import { STUDIO_AI_FEATURES } from "./nav";
import { StudioHeader } from "./StudioHeader";

export function StudioOverview() {
  const [data, setData] = useState<StudioOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    void fetchStudioOverview()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onNewProject() {
    await createProject();
    reload();
  }

  const filteredRecent =
    data?.recentMedia.filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return m.fileName.toLowerCase().includes(q) || m.sourceHint.toLowerCase().includes(q);
    }) ?? [];

  return (
    <>
      <StudioHeader
        title="Welcome to Founder OS Studio"
        subtitle="Local-first production for founders — organize footage, shape edits, and prepare AI-assisted output."
        actions={
          <>
            <button
              type="button"
              onClick={() => void onNewProject()}
              className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              New project
            </button>
            <Link
              href="/studio/media"
              className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-4 py-2 text-sm font-medium text-[var(--studio-text-primary)]"
            >
              <Upload className="h-4 w-4" />
              Import media
            </Link>
          </>
        }
        onSearch={setSearch}
      />

      <div className="studio-subtle-grid mx-auto w-full max-w-[1760px] flex-1 px-6 py-8 lg:px-10">
        {error ? (
          <p className="mb-6 rounded-lg border border-[var(--studio-danger)]/40 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Videos in library" value={data?.stats.videosInLibrary ?? "—"} icon={<Film className="h-4 w-4" />} />
          <MetricCard label="Active projects" value={data?.stats.activeProjects ?? "—"} icon={<Layers3 className="h-4 w-4" />} />
          <MetricCard label="Draft edits" value={data?.stats.draftEdits ?? "—"} />
          <MetricCard
            label="Finished exports"
            value={data?.stats.finishedExports ?? "—"}
            hint="Export engine not connected"
          />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Recent projects</h2>
              <Link href="/studio/projects" className="text-xs text-[var(--studio-accent)] hover:underline">
                View all
              </Link>
            </div>
            {data && data.projects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--studio-text-tertiary)]">Create a project to begin an edit sequence.</p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Media discovery</h2>
            <DirectoryManager initialDirectories={data?.directories ?? []} onUpdated={reload} />
            <div className="studio-panel p-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--studio-text-tertiary)]">
                Category breakdown
              </h3>
              <ul className="mt-3 space-y-2">
                {STUDIO_CONTENT_CATEGORIES.map((category) => (
                  <li key={category} className="flex items-center justify-between text-sm">
                    <CategoryBadge category={category} />
                    <span className="tabular-nums text-[var(--studio-text-secondary)]">
                      {data?.categoryCounts?.[category] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold text-[var(--studio-text-primary)]">Recently indexed</h2>
            <ul className="space-y-2">
              {filteredRecent.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--studio-text-primary)]">{m.fileName}</p>
                    <p className="truncate text-xs text-[var(--studio-text-tertiary)]">{m.sourceHint}</p>
                  </div>
                  <CategoryBadge category={m.category} />
                </li>
              ))}
              {data && filteredRecent.length === 0 ? (
                <li className="text-sm text-[var(--studio-text-tertiary)]">
                  No indexed videos yet · authorize a folder and scan.
                </li>
              ) : null}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold text-[var(--studio-text-primary)]">AI production center</h2>
            <div className="grid gap-3">
              {STUDIO_AI_FEATURES.map((f) => (
                <Link
                  key={f.title}
                  href="/studio/ai"
                  className="flex items-center gap-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 transition-colors hover:border-[var(--studio-border-strong)]"
                >
                  <Sparkles className="h-4 w-4 text-[var(--studio-accent)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--studio-text-primary)]">{f.title}</p>
                    <p className="text-xs text-[var(--studio-text-tertiary)]">Interface preview · intelligence coming soon</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-8">
          <ContentPipeline activeStage={data && data.stats.videosInLibrary > 0 ? "imported" : "ideas"} />
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-xs text-[var(--studio-text-tertiary)]">
          <FolderInput className="h-3.5 w-3.5" />
          Reusable content opportunities will calculate from categorized segments in a future release.
        </p>
      </div>
    </>
  );
}
