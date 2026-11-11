"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { saveProjectTimeline } from "@/lib/studio/client-api";
import type { StudioTimelineProject } from "@founder-os/studio";
import {
  addMediaToTimeline,
  duplicateClipInstance,
  getPrimaryVideoTrack,
  hydrateTimelineFromMediaIds,
  removeClipInstance,
  reorderClipInstances,
  updateClipTrim,
} from "@founder-os/studio";

const MAX_HISTORY = 48;
const AUTOSAVE_MS = 900;

function sourceDurationMap(media: StudioMediaPublic[]): Map<string, number | null> {
  return new Map(media.map((m) => [m.id, m.durationSeconds]));
}

function pushHistory(stack: StudioTimelineProject[], next: StudioTimelineProject): StudioTimelineProject[] {
  const merged = [...stack, next];
  if (merged.length > MAX_HISTORY) return merged.slice(merged.length - MAX_HISTORY);
  return merged;
}

export function useTimelineEditor(opts: {
  projectId: string | null;
  projectTitle: string;
  aspectRatio: string;
  mediaCatalog: StudioMediaPublic[];
  initialMediaIds: string[];
}) {
  const durations = useMemo(() => sourceDurationMap(opts.mediaCatalog), [opts.mediaCatalog]);

  const [timeline, setTimeline] = useState<StudioTimelineProject | null>(null);
  const [undoStack, setUndoStack] = useState<StudioTimelineProject[]>([]);
  const [redoStack, setRedoStack] = useState<StudioTimelineProject[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef<StudioTimelineProject | null>(null);
  timelineRef.current = timeline;

  const commit = useCallback((next: StudioTimelineProject, trackHistory = true) => {
    setTimeline((prev) => {
      if (trackHistory && prev) setUndoStack((h) => pushHistory(h, prev));
      if (trackHistory) setRedoStack([]);
      return next;
    });
  }, []);

  const loadInitial = useCallback(
    (fromServer: StudioTimelineProject | null) => {
      if (fromServer) {
        setTimeline(fromServer);
        setUndoStack([]);
        setRedoStack([]);
        return;
      }
      const hydrated = hydrateTimelineFromMediaIds(
        opts.projectId ?? "session",
        opts.projectTitle,
        opts.aspectRatio,
        opts.initialMediaIds,
        durations,
      );
      setTimeline(hydrated);
      setUndoStack([]);
      setRedoStack([]);
    },
    [durations, opts.aspectRatio, opts.initialMediaIds, opts.projectId, opts.projectTitle],
  );

  useEffect(() => {
    if (!timeline || !opts.projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveProjectTimeline(opts.projectId!, { ...timeline, projectId: opts.projectId! })
        .then(({ timeline: saved }) => {
          setTimeline(saved);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"))
        .finally(() => {
          saveTimer.current = null;
        });
      setSaveState("saving");
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [timeline, opts.projectId]);

  const mutate = useCallback(
    (fn: (current: StudioTimelineProject) => StudioTimelineProject) => {
      const current = timelineRef.current;
      if (!current) return;
      commit(fn(current));
    },
    [commit],
  );

  const addMedia = useCallback(
    (ids: string[]) => {
      mutate((t) => addMediaToTimeline(t, ids, durations));
    },
    [durations, mutate],
  );

  const removeClip = useCallback(
    (clipId: string) => {
      mutate((t) => removeClipInstance(t, clipId, durations));
    },
    [durations, mutate],
  );

  const duplicateClip = useCallback(
    (clipId: string) => {
      mutate((t) => duplicateClipInstance(t, clipId, durations));
    },
    [durations, mutate],
  );

  const reorder = useCallback(
    (orderedIds: string[]) => {
      mutate((t) => reorderClipInstances(t, orderedIds, durations));
    },
    [durations, mutate],
  );

  const trim = useCallback(
    (clipId: string, patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null }) => {
      mutate((t) => updateClipTrim(t, clipId, patch, durations));
    },
    [durations, mutate],
  );

  const undo = useCallback(() => {
    setUndoStack((h) => {
      if (!h.length || !timeline) return h;
      const prev = h[h.length - 1]!;
      setRedoStack((r) => pushHistory(r, timeline));
      setTimeline(prev);
      return h.slice(0, -1);
    });
  }, [timeline]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (!r.length || !timeline) return r;
      const next = r[r.length - 1]!;
      setUndoStack((h) => pushHistory(h, timeline));
      setTimeline(next);
      return r.slice(0, -1);
    });
  }, [timeline]);

  const clips = timeline ? getPrimaryVideoTrack(timeline) : [];

  return {
    timeline,
    clips,
    durations,
    loadInitial,
    addMedia,
    removeClip,
    duplicateClip,
    reorder,
    trim,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    saveState,
  };
}
