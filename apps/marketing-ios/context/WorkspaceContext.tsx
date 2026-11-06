import { repo } from '@/lib/data/repository';
import type { WorkspaceRow } from '@/lib/domain/types';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface WorkspaceContextValue {
  workspaces: WorkspaceRow[];
  activeId: string | null;
  active: WorkspaceRow | null;
  refresh: () => void;
  setActiveId: (id: string) => void;
  createWorkspace: (name: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>(() => {
    repo.init();
    return repo.listWorkspaces();
  });
  const [activeId, setActiveIdState] = useState<string | null>(() => workspaces[0]?.id ?? null);

  const refresh = useCallback(() => {
    const list = repo.listWorkspaces();
    setWorkspaces(list);
    if (list.length && !list.some((w) => w.id === activeId)) {
      setActiveIdState(list[0].id);
    }
    if (list.length === 0) {
      setActiveIdState(null);
    }
  }, [activeId]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
  }, []);

  const createWorkspace = useCallback((name: string) => {
    const w = repo.createWorkspace(name.trim());
    refresh();
    setActiveIdState(w.id);
  }, [refresh]);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId]
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeId,
      active,
      refresh,
      setActiveId,
      createWorkspace,
    }),
    [workspaces, activeId, active, refresh, setActiveId, createWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
