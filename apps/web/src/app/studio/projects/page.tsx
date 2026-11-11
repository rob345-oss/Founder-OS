"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import type { StudioProject } from "@founder-os/studio";

import { createProject, listProjects } from "@/lib/studio/client-api";

import { EmptyState } from "@/components/studio/EmptyState";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { StudioHeader } from "@/components/studio/StudioHeader";

export default function StudioProjectsPage() {
  const [projects, setProjects] = useState<StudioProject[]>([]);

  function reload() {
    void listProjects().then(({ projects: p }) => setProjects(p));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
  <div className="min-h-0 flex-1">
      <StudioHeader
        title="Projects"
        subtitle="Editing containers stored locally until cloud sync is opt-in."
        actions={
          <button
            type="button"
            onClick={() => void createProject().then(reload)}
            className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        }
      />
      <div className="px-8 py-8">
        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No projects yet"
            description="Projects open in the editor shell. Rendering, collaboration, and cloud sync arrive in later phases."
          />
        )}
      </div>
    </div>
  );
}
