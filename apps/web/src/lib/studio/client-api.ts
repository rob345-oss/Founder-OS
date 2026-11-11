import type {
  StudioAuthorizedDirectory,
  StudioCollection,
  StudioContentCategory,
  StudioMediaItem,
  StudioProject,
  StudioReviewStatus,
  StudioScanJob,
  StudioExportJob,
  StudioExportJobSettings,
  StudioExportPresetId,
  StudioTimelineProject,
} from "@founder-os/studio";

export type { StudioContentCategory };

export type StudioDirectoryPublic = Omit<StudioAuthorizedDirectory, "rootPath"> & {
  rootLabel: string;
};

export type StudioMediaRootPublic = {
  enforced: boolean;
  ready: boolean;
  displayName: string | null;
  error: string | null;
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

export type MediaQuery = {
  q?: string;
  category?: StudioContentCategory;
  directoryId?: string;
  kind?: "video" | "image";
  favorite?: boolean;
  reviewStatus?: StudioReviewStatus;
  collectionId?: string;
  sort?: "modified_desc" | "modified_asc" | "name" | "duration" | "size" | "rating";
  recent?: boolean;
  missing?: boolean;
};

export function fetchStudioMedia(params?: MediaQuery): Promise<{ items: StudioMediaPublic[] }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  if (params?.directoryId) sp.set("directoryId", params.directoryId);
  if (params?.kind) sp.set("kind", params.kind);
  if (params?.favorite) sp.set("favorite", "1");
  if (params?.reviewStatus) sp.set("reviewStatus", params.reviewStatus);
  if (params?.collectionId) sp.set("collectionId", params.collectionId);
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.recent) sp.set("recent", "1");
  if (params?.missing) sp.set("missing", "1");
  const qs = sp.toString();
  return studioFetch(`/api/studio/media${qs ? `?${qs}` : ""}`);
}

export function pickMediaFolder(): Promise<{ path?: string; cancelled?: boolean; error?: string }> {
  return studioFetch("/api/studio/directories/pick", { method: "POST" });
}

export function registerDirectory(body: {
  path: string;
  label?: string;
  scan?: boolean;
}): Promise<{ directory: StudioDirectoryPublic; scanJobId?: string }> {
  return studioFetch("/api/studio/directories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeDirectory(id: string): Promise<{ ok: boolean }> {
  return studioFetch(`/api/studio/directories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listDirectories(): Promise<{
  directories: StudioDirectoryPublic[];
  mediaRoot?: StudioMediaRootPublic;
}> {
  return studioFetch("/api/studio/directories");
}

export function scanMedia(opts?: {
  directoryId?: string;
  wait?: boolean;
  cancelJobId?: string;
}): Promise<{
  result?: { added: number; updated: number; removed: number; total: number };
  jobId?: string;
  error?: string;
}> {
  return studioFetch("/api/studio/scan", {
    method: "POST",
    body: JSON.stringify(opts ?? {}),
  });
}

export function getScanStatus(jobId?: string): Promise<{ job: StudioScanJob | null }> {
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  return studioFetch(`/api/studio/scan${qs}`);
}

export function patchMedia(
  id: string,
  patch: Partial<{
    category: StudioContentCategory;
    pipelineStage: StudioMediaItem["pipelineStage"];
    favorite: boolean;
    rating: number | null;
    reviewStatus: StudioReviewStatus;
    takeNumber: number | null;
    notes: string;
    tags: string[];
    projectId: string | null;
  }>,
): Promise<{ item: StudioMediaPublic }> {
  return studioFetch(`/api/studio/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function bulkPatchMedia(body: {
  ids: string[];
  patch?: {
    category?: StudioContentCategory;
    reviewStatus?: StudioReviewStatus;
    favorite?: boolean;
    rating?: number | null;
    tags?: string[];
  };
  collectionId?: string;
}): Promise<{ updated: StudioMediaPublic[]; errors: { id: string; error: string }[] }> {
  return studioFetch("/api/studio/media/bulk", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listCollections(): Promise<{ collections: StudioCollection[] }> {
  return studioFetch("/api/studio/collections");
}

export function createCollection(name: string, mediaIds?: string[]): Promise<{ collection: StudioCollection }> {
  return studioFetch("/api/studio/collections", {
    method: "POST",
    body: JSON.stringify({ name, mediaIds }),
  });
}

export function createProject(title?: string, mediaIds?: string[]): Promise<{ project: StudioProject }> {
  return studioFetch("/api/studio/projects", {
    method: "POST",
    body: JSON.stringify({ title, mediaIds }),
  });
}

export function setProjectMedia(projectId: string, mediaIds: string[]): Promise<{ project: StudioProject }> {
  return studioFetch(`/api/studio/projects/${projectId}/media`, {
    method: "PUT",
    body: JSON.stringify({ mediaIds }),
  });
}

export function fetchProjectTimeline(projectId: string): Promise<{ timeline: StudioTimelineProject }> {
  return studioFetch(`/api/studio/projects/${projectId}/timeline`);
}

export function saveProjectTimeline(
  projectId: string,
  timeline: StudioTimelineProject,
): Promise<{ timeline: StudioTimelineProject }> {
  return studioFetch(`/api/studio/projects/${projectId}/timeline`, {
    method: "PUT",
    body: JSON.stringify({ timeline }),
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

export function revealMediaInExplorer(id: string): Promise<{ ok: boolean; error?: string }> {
  return studioFetch(`/api/studio/media/${id}/reveal`, { method: "POST" });
}

export const EDITOR_QUEUE_KEY = "founder-os-studio-editor-queue";

export function persistEditorQueue(mediaIds: string[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EDITOR_QUEUE_KEY, JSON.stringify(mediaIds));
}

export function fetchFfmpegStatus(): Promise<{
  available: boolean;
  ffmpeg: string | null;
  ffprobe: string | null;
  hint: string;
}> {
  return studioFetch("/api/studio/exports/ffmpeg");
}

export function listExportJobs(): Promise<{ jobs: StudioExportJob[] }> {
  return studioFetch("/api/studio/exports");
}

export function fetchExportJob(id: string): Promise<{ job: StudioExportJob }> {
  return studioFetch(`/api/studio/exports/${id}`);
}

export function startExport(body: {
  projectId: string;
  presetId: StudioExportPresetId;
  settings: StudioExportJobSettings;
}): Promise<{ job: StudioExportJob }> {
  return studioFetch("/api/studio/exports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelExportJob(id: string): Promise<{ job: StudioExportJob }> {
  return studioFetch(`/api/studio/exports/${id}`, {
    method: "POST",
    body: JSON.stringify({ action: "cancel" }),
  });
}

export function pickExportDestination(): Promise<{ path?: string; cancelled?: boolean; error?: string }> {
  return studioFetch("/api/studio/exports/pick-destination", { method: "POST" });
}

export function exportStreamUrl(jobId: string): string {
  return `/api/studio/exports/${jobId}/stream`;
}

export function revealExportInExplorer(jobId: string): Promise<{ ok: boolean; error?: string }> {
  return studioFetch(`/api/studio/exports/${jobId}/reveal`, { method: "POST" });
}

export function readEditorQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(EDITOR_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
