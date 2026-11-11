import type {
  StudioAuthorizedDirectory,
  StudioContentCategory,
  StudioMediaItem,
  StudioProject,
} from "@founder-os/studio";

// Re-export for page consumers
export type { StudioContentCategory };

export type StudioDirectoryPublic = Omit<StudioAuthorizedDirectory, "rootPath"> & {
  rootLabel: string;
};

export type StudioMediaPublic = StudioMediaItem & {
  directoryLabel: string;
  sourceHint: string;
};

export type StudioStats = {
  videosInLibrary: number;
  activeProjects: number;
  draftEdits: number;
  finishedExports: number;
  reusableOpportunities: number | null;
  demoMode: boolean;
};

export type StudioOverviewPayload = {
  stats: StudioStats;
  projects: StudioProject[];
  recentMedia: StudioMediaPublic[];
  directories: StudioDirectoryPublic[];
  categoryCounts: Partial<Record<StudioContentCategory, number>>;
};

/** Optional client header — must match server STUDIO_LOCAL_TOKEN (NEXT_PUBLIC is not secret). */
function studioHeaders(): HeadersInit {
  const token = process.env.NEXT_PUBLIC_STUDIO_LOCAL_TOKEN?.trim();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["X-Studio-Local-Token"] = token;
  return headers;
}

async function studioFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...studioHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchStudioOverview(): Promise<StudioOverviewPayload> {
  return studioFetch("/api/studio/overview");
}

export function fetchStudioMedia(params?: {
  q?: string;
  category?: StudioContentCategory;
  directoryId?: string;
}): Promise<{ items: StudioMediaPublic[] }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  if (params?.directoryId) sp.set("directoryId", params.directoryId);
  const qs = sp.toString();
  return studioFetch(`/api/studio/media${qs ? `?${qs}` : ""}`);
}

export function registerDirectory(body: {
  path: string;
  label?: string;
}): Promise<{ directory: StudioDirectoryPublic }> {
  return studioFetch("/api/studio/directories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listDirectories(): Promise<{ directories: StudioDirectoryPublic[] }> {
  return studioFetch("/api/studio/directories");
}

export function scanMedia(): Promise<{ result: { added: number; updated: number; removed: number; total: number } }> {
  return studioFetch("/api/studio/scan", { method: "POST" });
}

export function patchMedia(
  id: string,
  patch: { category?: StudioContentCategory; pipelineStage?: StudioMediaItem["pipelineStage"] },
): Promise<{ item: StudioMediaPublic }> {
  return studioFetch(`/api/studio/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function createProject(title?: string): Promise<{ project: StudioProject }> {
  return studioFetch("/api/studio/projects", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function listProjects(): Promise<{ projects: StudioProject[] }> {
  return studioFetch("/api/studio/projects");
}

export function mediaStreamUrl(id: string): string {
  return `/api/studio/media/${id}/stream`;
}

export function mediaThumbnailUrl(id: string): string {
  return `/api/studio/media/${id}/thumbnail`;
}
