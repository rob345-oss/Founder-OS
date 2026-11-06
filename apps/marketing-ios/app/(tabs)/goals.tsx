import { ScreenChrome } from '@/components/ScreenChrome';
import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { repo } from '@/lib/data/repository';
import type { MetricRow } from '@/lib/domain/types';
import { generateGoalRecommendations } from '@/lib/domain/goalRecommendations';
import { computeGoalProgress } from '@/lib/domain/goalProgress';
import { KPI_LABELS } from '@/lib/domain/kpi';
import { toISODate } from '@/lib/domain/date';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import type { GoalPriority, GoalStatus, GoalType, KpiKey, MarketingPlatform } from '@/lib/domain/types';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

const PLATFORMS: MarketingPlatform[] = [
  'linkedin',
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'website',
  'other',
];

function deriveRecent(metrics: MetricRow[], kpi: string, platform: string) {
  const sub = metrics
    .filter((m) => m.kpi_key === kpi && m.platform === platform)
    .sort((a, b) => (a.period_end < b.period_end ? 1 : -1))
    .slice(0, 5);
  const values = sub.map((m) => m.value);
  const days = sub.map((m) => {
    const a = new Date(m.period_start).getTime();
    const b = new Date(m.period_end).getTime();
    return Math.max(1, Math.round((b - a) / (86400000)) + 1);
  });
  return { values, days };
}

export default function GoalsScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();
  const { goals, metrics, refresh, workspaceId } = useWorkspaceData();
  const [modal, setModal] = useState(false);
  const [recoModal, setRecoModal] = useState(false);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<MarketingPlatform>('linkedin');
  const [kpi, setKpi] = useState<KpiKey>('followers');
  const [goalType, setGoalType] = useState<GoalType>('outcome');
  const [startVal, setStartVal] = useState('');
  const [targetVal, setTargetVal] = useState('');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState(toISODate(new Date(Date.now() + 30 * 86400000)));
  const [priority, setPriority] = useState<GoalPriority>('medium');

  const views = useMemo(
    () => goals.map((g) => computeGoalProgress(g, metrics)),
    [goals, metrics]
  );

  const recommendations = useMemo(() => {
    const { values, days } = deriveRecent(metrics, kpi, platform);
    const baseline = values[0];
    return generateGoalRecommendations({
      platform,
      kpiKey: kpi,
      recentMetricValues: values,
      metricPeriodDays: days.length ? days : [7],
      hoursPerWeek: 8,
      baseline: baseline !== undefined ? baseline : undefined,
    });
  }, [metrics, kpi, platform]);

  const resetForm = () => {
    setName('');
    setTargetVal('');
    setStartVal('');
    setStartDate(toISODate(new Date()));
    setEndDate(toISODate(new Date(Date.now() + 30 * 86400000)));
  };

  if (!workspaceId || !active) {
    return (
      <ScreenChrome title="Goals" subtitle="Pick a workspace">
        <View />
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome title="Goals" subtitle="Outcome vs activity, with pace">
      <Pressable style={[styles.fab, { backgroundColor: t.accent }]} onPress={() => setModal(true)}>
        <Caption style={{ color: '#fff', fontWeight: '700' }}>＋ New goal</Caption>
      </Pressable>

      <FlatList
        data={views}
        keyExtractor={(v) => v.goal.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: gv }) => (
          <AppCard style={{ marginBottom: 12 }}>
            <View style={styles.rowBetween}>
              <Body style={{ fontWeight: '700', flex: 1 }}>{gv.goal.name}</Body>
              <Caption style={{ color: t.textSecondary }}>{gv.goal.status}</Caption>
            </View>
            <Caption style={{ marginTop: 4 }}>
              {gv.goal.platform} · {KPI_LABELS[gv.goal.kpi_key as KpiKey]} · {gv.goal.goal_type}
            </Caption>
            <Caption style={{ marginTop: 8 }}>
              Progress{' '}
              {gv.progressRatio !== null ? `${Math.round(gv.progressRatio * 100)}%` : '—'} · Weekly
              need {gv.weeklyTarget !== null ? gv.weeklyTarget.toFixed(1) : '—'} · Pace:{' '}
              {gv.requiredPacePerWeek !== null ? gv.requiredPacePerWeek.toFixed(1) : '—'}
            </Caption>
            <ProgressBar value={gv.progressRatio ?? 0} />
            <Caption style={{ marginTop: 8 }}>{gv.paceNote}</Caption>
          </AppCard>
        )}
        ListEmptyComponent={<Caption style={{ padding: 24 }}>No goals yet.</Caption>}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: t.card }]}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}>
            <Title style={{ fontSize: 18, marginBottom: 12 }}>New goal</Title>

            <Caption>Name</Caption>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grow LinkedIn followers"
              style={[styles.input, { color: t.text, borderColor: t.border }]}
              placeholderTextColor={t.textSecondary}
            />

            <Caption>Platform</Caption>
            <ScrollView horizontal style={{ marginVertical: 8 }}>
              {PLATFORMS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPlatform(p)}
                  style={[styles.chip, platform === p && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: platform === p ? t.accent : t.text }}>{p}</Caption>
                </Pressable>
              ))}
            </ScrollView>

            <Caption>KPI</Caption>
            <ScrollView horizontal style={{ marginVertical: 8 }}>
              {(Object.keys(KPI_LABELS) as KpiKey[]).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKpi(k)}
                  style={[styles.chip, kpi === k && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: kpi === k ? t.accent : t.text }}>{KPI_LABELS[k]}</Caption>
                </Pressable>
              ))}
            </ScrollView>

            <Caption>Goal type</Caption>
            <View style={{ flexDirection: 'row', marginVertical: 8, gap: 8 }}>
              {(['outcome', 'activity'] as GoalType[]).map((gt) => (
                <Pressable
                  key={gt}
                  onPress={() => setGoalType(gt)}
                  style={[styles.chip, goalType === gt && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: goalType === gt ? t.accent : t.text }}>{gt}</Caption>
                </Pressable>
              ))}
            </View>

            <Caption>Starting value (optional)</Caption>
            <TextInput
              value={startVal}
              onChangeText={setStartVal}
              keyboardType="decimal-pad"
              style={[styles.input, { color: t.text, borderColor: t.border }]}
              placeholderTextColor={t.textSecondary}
            />
            <Caption>Target value</Caption>
            <TextInput
              value={targetVal}
              onChangeText={setTargetVal}
              keyboardType="decimal-pad"
              style={[styles.input, { color: t.text, borderColor: t.border }]}
              placeholderTextColor={t.textSecondary}
            />

            <Caption>Start / end (YYYY-MM-DD)</Caption>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              style={[styles.input, { color: t.text, borderColor: t.border }]}
            />
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              style={[styles.input, { color: t.text, borderColor: t.border }]}
            />

            <Caption>Priority</Caption>
            <View style={{ flexDirection: 'row', marginVertical: 8, gap: 8 }}>
              {(['low', 'medium', 'high'] as GoalPriority[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.chip, priority === p && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: priority === p ? t.accent : t.text }}>{p}</Caption>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setRecoModal(true)} style={{ marginBottom: 12 }}>
              <Caption style={{ color: t.accent, fontWeight: '600' }}>Get recommendations for this KPI…</Caption>
            </Pressable>

            <Pressable
              onPress={() => {
                const tv = Number(targetVal);
                if (!name.trim() || Number.isNaN(tv)) {
                  Alert.alert('Check inputs', 'Name and numeric target are required.');
                  return;
                }
                const sv = startVal === '' ? null : Number(startVal);
                repo.insertGoal({
                  workspace_id: active.id,
                  name: name.trim(),
                  platform,
                  kpi_key: kpi,
                  goal_type: goalType,
                  start_value: sv !== null && Number.isNaN(sv) ? null : sv,
                  target_value: tv,
                  start_date: startDate,
                  end_date: endDate,
                  priority,
                  status: 'active',
                  supporting_activities: null,
                });
                refresh();
                resetForm();
                setModal(false);
              }}
              style={[styles.cta, { backgroundColor: t.accent }]}>
              <Caption style={{ color: '#fff', fontWeight: '700' }}>Save goal</Caption>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>

      <Modal visible={recoModal} animationType="fade" transparent>
        <Pressable style={styles.backdrop} onPress={() => setRecoModal(false)}>
          <View style={[styles.sheet, { backgroundColor: t.card, maxHeight: '80%' }]}>
            <Title style={{ fontSize: 18, marginBottom: 8 }}>Recommendations</Title>
            <Caption style={{ marginBottom: 12 }}>
              Deterministic scenarios — edit before saving a goal.
            </Caption>
            <ScrollView>
              {recommendations.map((r) => (
                <AppCard key={r.scenario} style={{ marginBottom: 12 }}>
                  <Body style={{ fontWeight: '700' }}>{r.title}</Body>
                  <Caption>
                    Target ≈ {r.suggestedTarget} over {r.suggestedHorizonDays} days
                  </Caption>
                  {r.reasoning.map((line, i) => (
                    <Caption key={i} style={{ marginTop: 4 }}>
                      · {line}
                    </Caption>
                  ))}
                  <Pressable
                    onPress={() => {
                      setTargetVal(String(r.suggestedTarget));
                      setRecoModal(false);
                    }}
                    style={{ marginTop: 8 }}>
                    <Caption style={{ color: t.accent, fontWeight: '600' }}>Apply target</Caption>
                  </Pressable>
                </AppCard>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScreenChrome>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    zIndex: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  cta: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
