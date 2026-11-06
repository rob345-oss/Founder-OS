import { ScreenChrome } from '@/components/ScreenChrome';
import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { SegmentedPeriod } from '@/components/ui/SegmentedPeriod';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { repo } from '@/lib/data/repository';
import { filterMetricsByPeriod, growthBetweenLatest, metricSeriesForChart } from '@/lib/domain/analyticsAggregation';
import { KPI_LABELS } from '@/lib/domain/kpi';
import type { KpiKey, MarketingPlatform, MeasurementType, ReportingPeriod } from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';
import { parseMetricsCsv } from '@/lib/import/csv';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
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
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'website',
  'other',
];

export default function AnalyticsScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();
  const { metrics, refresh, workspaceId } = useWorkspaceData();
  const [period, setPeriod] = useState<ReportingPeriod>('monthly');
  const [addOpen, setAddOpen] = useState(false);

  const [platform, setPlatform] = useState<MarketingPlatform>('linkedin');
  const [kpi, setKpi] = useState<KpiKey>('followers');
  const [value, setValue] = useState('');
  const [periodStart, setPeriodStart] = useState(toISODate(new Date()));
  const [periodEnd, setPeriodEnd] = useState(toISODate(new Date()));
  const [mType, setMType] = useState<MeasurementType>('actual');

  const filtered = useMemo(() => filterMetricsByPeriod(metrics, period), [metrics, period]);

  const platformsInUse = useMemo(() => {
    const s = new Set<string>();
    metrics.forEach((m) => s.add(m.platform));
    return Array.from(s);
  }, [metrics]);

  if (!workspaceId || !active) {
    return (
      <ScreenChrome title="Analytics" subtitle="Pick a workspace">
        <View />
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome title="Analytics" subtitle="Manual & CSV — measured vs derived">
      <ScrollView contentContainerStyle={styles.scroll}>
        <SegmentedPeriod value={period} onChange={setPeriod} />

        <Pressable style={[styles.btn, { backgroundColor: t.accent }]} onPress={() => setAddOpen(true)}>
          <Caption style={{ color: '#fff', fontWeight: '700' }}>Record metric</Caption>
        </Pressable>

        <Pressable
          style={[styles.btnOutline, { borderColor: t.border }]}
          onPress={async () => {
            try {
              const res = await DocumentPicker.getDocumentAsync({ type: 'text/*', copyToCacheDirectory: true });
              if (res.canceled || !res.assets?.[0]) return;
              const uri = res.assets[0].uri;
              const text = await readAsStringAsync(uri);
              const rows = parseMetricsCsv(text);
              for (const r of rows) {
                repo.insertMetric({
                  ...r,
                  workspace_id: active.id,
                  provider: 'csv',
                  notes: 'CSV import',
                });
              }
              refresh();
              Alert.alert('Import complete', `${rows.length} rows added.`);
            } catch (e) {
              Alert.alert('Import failed', String(e));
            }
          }}>
          <Caption style={{ fontWeight: '600' }}>Import CSV</Caption>
        </Pressable>

        {platformsInUse.map((plat) => (
          <AppCard key={plat} style={{ marginTop: 16 }}>
            <Body style={{ fontWeight: '700' }}>{plat}</Body>
            {(Object.keys(KPI_LABELS) as KpiKey[]).map((k) => {
              const series = metricSeriesForChart(filtered, plat, k, 8);
              if (series.length === 0) return null;
              const growth = growthBetweenLatest(filtered, plat, k);
              return (
                <View key={k} style={{ marginTop: 12 }}>
                  <Caption>
                    {KPI_LABELS[k]}
                    {growth !== null ? ` · Δ ${growth.toFixed(1)}` : ''}
                  </Caption>
                  <SimpleLineChart points={series} emptyLabel="" />
                </View>
              );
            })}
          </AppCard>
        ))}

        <AppCard style={{ marginTop: 16 }}>
          <Caption>Recent entries ({period})</Caption>
          <FlatList
            data={filtered.slice(0, 30)}
            scrollEnabled={false}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border }}>
                <Body>
                  {item.platform} · {KPI_LABELS[item.kpi_key as KpiKey]} = {item.value}
                </Body>
                <Caption>
                  {item.period_start} → {item.period_end} · {item.measurement_type}
                </Caption>
              </View>
            )}
            ListEmptyComponent={<Caption>No metrics in this window.</Caption>}
          />
        </AppCard>
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: t.card }]}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}>
            <Title style={{ fontSize: 18 }}>Record metric</Title>
            <Caption style={{ marginBottom: 12 }}>Stored locally only</Caption>

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

            <Caption>Value</Caption>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: t.border, color: t.text }]}
            />

            <Caption>Period start / end</Caption>
            <TextInput value={periodStart} onChangeText={setPeriodStart} style={[styles.input, { borderColor: t.border, color: t.text }]} />
            <TextInput value={periodEnd} onChangeText={setPeriodEnd} style={[styles.input, { borderColor: t.border, color: t.text }]} />

            <Caption>Measurement</Caption>
            <View style={{ flexDirection: 'row', marginVertical: 8, gap: 8 }}>
              {(['actual', 'calculated'] as MeasurementType[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMType(m)}
                  style={[styles.chip, mType === m && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: mType === m ? t.accent : t.text }}>{m}</Caption>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => {
                const v = Number(value);
                if (Number.isNaN(v)) {
                  Alert.alert('Invalid', 'Enter a numeric value.');
                  return;
                }
                repo.insertMetric({
                  workspace_id: active.id,
                  platform,
                  provider: 'manual',
                  kpi_key: kpi,
                  value: v,
                  period_start: periodStart,
                  period_end: periodEnd,
                  measurement_type: mType,
                  source: 'manual',
                  notes: null,
                });
                refresh();
                setValue('');
                setAddOpen(false);
              }}
              style={[styles.btn, { backgroundColor: t.accent, marginTop: 12 }]}>
              <Caption style={{ color: '#fff', fontWeight: '700' }}>Save</Caption>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </ScreenChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  btn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOutline: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
});
