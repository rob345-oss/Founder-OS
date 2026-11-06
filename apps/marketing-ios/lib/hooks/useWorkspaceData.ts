import { useWorkspace } from '@/context/WorkspaceContext';
import { repo } from '@/lib/data/repository';
import type {
  CampaignRow,
  ContentItemRow,
  GoalRow,
  MetricRow,
} from '@/lib/domain/types';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useWorkspaceData() {
  const { activeId } = useWorkspace();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [content, setContent] = useState<ContentItemRow[]>([]);

  const load = useCallback(() => {
    if (!activeId) {
      setGoals([]);
      setMetrics([]);
      setCampaigns([]);
      setContent([]);
      return;
    }
    setGoals(repo.listGoals(activeId));
    setMetrics(repo.listMetrics(activeId));
    setCampaigns(repo.listCampaigns(activeId));
    setContent(repo.listContent(activeId));
  }, [activeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { goals, metrics, campaigns, content, refresh: load, workspaceId: activeId };
}
