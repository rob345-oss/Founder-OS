import { ScreenChrome } from '@/components/ScreenChrome';
import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SegmentedPeriod } from '@/components/ui/SegmentedPeriod';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { repo } from '@/lib/data/repository';
import { filterMetricsByPeriod, metricSeriesForChart } from '@/lib/domain/analyticsAggregation';
import { datesInWeekAround } from '@/lib/domain/date';
import { upcomingScheduledContent } from '@/lib/domain/goalProgress';
import { computeGoalProgress } from '@/lib/domain/goalProgress';
import { KPI_LABELS } from '@/lib/domain/kpi';
import type { KpiKey, ReportingPeriod } from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Modal, FlatList } from 'react-native';

export default function DashboardScreen() {
  const t = useAppTheme();
  const { active, refresh: refreshWs } = useWorkspace();
  const { goals, metrics, campaigns, content, workspaceId } = useWorkspaceData();
  const [period, setPeriod] = useState<ReportingPeriod>('weekly');
  const [kpiPicker, setKpiPicker] = useState(false);

  const filteredMetrics = useMemo(() => filterMetricsByPeriod(metrics, period), [metrics, period]);
  const dashboardKpis = active ? repo.getDashboardKpis(active.id) : [];

  const today = useMemo(() => new Date(), []);

  const goalViews = useMemo(
    () => goals.map((g) => computeGoalProgress(g, metrics, today)),
    [goals, metrics, today]
  );

  const activeGoals = goalViews.filter((g) => g.goal.status === 'active' || g.goal.status === 'planned');
  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((s, g) => s + (g.progressRatio ?? 0), 0) / activeGoals.length
      : null;

  const { start: wStart, end: wEnd } = datesInWeekAround(today);
  const publishedThisWeek = content.filter(
    (c) =>
      c.status === 'published' &&
      c.published_date &&
      c.published_date >= wStart &&
      c.published_date <= wEnd
  ).length;

  const upcoming = upcomingScheduledContent(content, today, 7);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const campaignHealth = activeCampaigns.map((c) => {
    const total = new Date(c.end_date).getTime() - new Date(c.start_date).getTime();
    const now = today.getTime();
    const elapsed = Math.min(1, Math.max(0, (now - new Date(c.start_date).getTime()) / total));
    return { c, elapsed };
  });

  const attention = goalViews.filter((g) => {
    if (g.progressRatio === null) return true;
    const start = new Date(g.goal.start_date).getTime();
    const end = new Date(g.goal.end_date).getTime();
    const elapsed = Math.min(1, Math.max(0, (today.getTime() - start) / (end - start || 1)));
    return g.progressRatio + 0.05 < elapsed && g.goal.status !== 'completed';
  });

  const chartPlatform = activeGoals[0]?.goal.platform ?? 'linkedin';
  const chartKpi = dashboardKpis[0] ?? 'followers';
  const series = metricSeriesForChart(filteredMetrics, chartPlatform, chartKpi);

  const toggleKpi = useCallback(
    (key: KpiKey) => {
      if (!active) return;
      const cur = repo.getDashboardKpis(active.id);
      const has = cur.includes(key);
      const next = has ? cur.filter((k) => k !== key) : [...cur, key];
      repo.setDashboardKpis(active.id, next.length ? next : ['followers']);
      refreshWs();
    },
    [active, refreshWs]
  );

  if (!workspaceId) {
    return (
      <ScreenChrome title="Command Center" subtitle="Create a workspace in Settings">
        <View style={{ padding: 20 }} />
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome
      title="Command Center"
      subtitle="Am I making meaningful marketing progress?"
      showNavLinks>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SegmentedPeriod value={period} onChange={setPeriod} />

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Overall progress</Caption>
          <Title style={{ fontSize: 22, marginVertical: 8 }}>
            {avgProgress !== null ? `${Math.round(avgProgress * 100)}%` : '—'}
          </Title>
          <ProgressBar value={avgProgress ?? 0} />
          <Caption style={{ marginTop: 8 }}>
            Average completion across active goals (local metrics only — not live platform data).
          </Caption>
        </AppCard>

        <View style={styles.rowBetween}>
          <Caption style={{ marginTop: 16, fontWeight: '700' }}>KPI cards</Caption>
          <Pressable onPress={() => setKpiPicker(true)}>
            <Caption style={{ color: t.accent, fontWeight: '600' }}>Customize</Caption>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {dashboardKpis.map((key) => {
            const m = filteredMetrics.find((x) => x.kpi_key === key);
            return (
              <AppCard key={key} style={{ width: 160, marginRight: 12 }}>
                <Caption>{KPI_LABELS[key]}</Caption>
                <Title style={{ fontSize: 22, marginTop: 6 }}>{m ? m.value : '—'}</Title>
                <Caption style={{ marginTop: 4 }}>{m?.platform ?? '—'}</Caption>
              </AppCard>
            );
          })}
        </ScrollView>

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Trend ({chartPlatform} · {KPI_LABELS[chartKpi]})</Caption>
          <SimpleLineChart points={series} emptyLabel="Add metrics in Analytics to see history." />
        </AppCard>

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Active goals</Caption>
          {activeGoals.slice(0, 4).map((gv) => (
            <View key={gv.goal.id} style={styles.goalRow}>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>{gv.goal.name}</Body>
                <Caption>
                  {gv.progressRatio !== null ? `${Math.round(gv.progressRatio * 100)}%` : 'No metric yet'}
                </Caption>
              </View>
              <View style={{ width: 100 }}>
                <ProgressBar value={gv.progressRatio ?? 0} />
              </View>
            </View>
          ))}
          {activeGoals.length === 0 ? <Caption>No active goals yet — add some in Goals.</Caption> : null}
        </AppCard>

        <View style={styles.split}>
          <AppCard style={{ flex: 1, marginRight: 8 }}>
            <Caption>Published (week)</Caption>
            <Title style={{ fontSize: 24, marginTop: 6 }}>{publishedThisWeek}</Title>
          </AppCard>
          <AppCard style={{ flex: 1, marginLeft: 8 }}>
            <Caption>Scheduled (7d)</Caption>
            <Title style={{ fontSize: 24, marginTop: 6 }}>{upcoming}</Title>
          </AppCard>
        </View>

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Campaign pulse</Caption>
          {campaignHealth.map(({ c, elapsed }) => (
            <View key={c.id} style={{ marginTop: 10 }}>
              <Body style={{ fontWeight: '600' }}>{c.name}</Body>
              <ProgressBar value={elapsed} />
              <Caption>Timeline progress (not revenue)</Caption>
            </View>
          ))}
          {campaignHealth.length === 0 ? <Caption>No active campaigns.</Caption> : null}
        </AppCard>

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Areas needing attention</Caption>
          {attention.slice(0, 4).map((gv) => (
            <Caption key={gv.goal.id} style={{ marginTop: 6 }}>
              • {gv.goal.name}: {gv.paceNote}
            </Caption>
          ))}
          {attention.length === 0 ? <Caption>Nothing flagged — keep recording metrics.</Caption> : null}
        </AppCard>

        <Caption style={{ marginVertical: 16, textAlign: 'center', color: t.textSecondary }}>
          Showing {period} window ending {toISODate(today)}
        </Caption>
      </ScrollView>

      <Modal visible={kpiPicker} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setKpiPicker(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: t.card }]}
            onPress={(e) => e.stopPropagation()}>
            <Title style={{ fontSize: 18, marginBottom: 12 }}>Dashboard KPIs</Title>
            <FlatList
              data={Object.keys(KPI_LABELS) as KpiKey[]}
              keyExtractor={(k) => k}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => toggleKpi(item)}
                  style={[
                    styles.kpiRow,
                    dashboardKpis.includes(item) && { backgroundColor: t.accentMuted },
                  ]}>
                  <Body>{KPI_LABELS[item]}</Body>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setKpiPicker(false)} style={{ marginTop: 12 }}>
              <Caption style={{ color: t.accent }}>Done</Caption>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  split: { flexDirection: 'row', marginTop: 16 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  kpiRow: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
});
