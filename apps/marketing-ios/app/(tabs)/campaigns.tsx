import { ScreenChrome } from '@/components/ScreenChrome';
import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { repo } from '@/lib/data/repository';
import type { CampaignKind, CampaignStatus, MarketingPlatform } from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useState } from 'react';
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

export default function CampaignsScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();
  const { campaigns, refresh, workspaceId } = useWorkspaceData();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [start, setStart] = useState(toISODate(new Date()));
  const [end, setEnd] = useState(toISODate(new Date(Date.now() + 14 * 86400000)));
  const [kind, setKind] = useState<CampaignKind>('organic');
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [platform, setPlatform] = useState<MarketingPlatform>('linkedin');
  const [budget, setBudget] = useState('');

  if (!workspaceId || !active) {
    return (
      <ScreenChrome title="Campaigns" subtitle="Pick a workspace">
        <View />
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome title="Campaigns" subtitle="Organic or paid — tracked locally">
      <Pressable style={[styles.fab, { backgroundColor: t.accent }]} onPress={() => setModal(true)}>
        <Caption style={{ color: '#fff', fontWeight: '700' }}>＋ Campaign</Caption>
      </Pressable>

      <FlatList
        data={campaigns}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const total = new Date(item.end_date).getTime() - new Date(item.start_date).getTime();
          const now = Date.now();
          const pct = Math.min(1, Math.max(0, (now - new Date(item.start_date).getTime()) / (total || 1)));
          let k: string[] = [];
          try {
            k = JSON.parse(item.kpis || '[]') as string[];
          } catch {
            k = [];
          }
          return (
            <AppCard style={{ marginBottom: 12 }}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{item.name}</Body>
                <Caption>{item.status}</Caption>
              </View>
              <Caption>
                {item.kind} · {item.start_date} → {item.end_date}
              </Caption>
              <Caption style={{ marginTop: 6 }}>Objective: {item.objective ?? '—'}</Caption>
              <Caption style={{ marginTop: 4 }}>KPIs: {k.join(', ') || '—'}</Caption>
              <Caption style={{ marginTop: 4 }}>
                Budget {item.budget_cents !== null ? `$${(item.budget_cents / 100).toFixed(0)}` : '—'}
              </Caption>
              <Caption style={{ marginTop: 8 }}>Timeline</Caption>
              <ProgressBar value={pct} />
              <Caption style={{ marginTop: 6, color: t.textSecondary }}>{item.results_notes ?? 'Results: add in a future edit pass'}</Caption>
            </AppCard>
          );
        }}
        ListEmptyComponent={<Caption style={{ padding: 24 }}>No campaigns yet.</Caption>}
      />

      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: t.card }]}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}>
            <Title style={{ fontSize: 18 }}>New campaign</Title>

            <Caption style={{ marginTop: 12 }}>Name</Caption>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { borderColor: t.border, color: t.text }]}
              placeholderTextColor={t.textSecondary}
            />

            <Caption>Objective</Caption>
            <TextInput
              value={objective}
              onChangeText={setObjective}
              style={[styles.input, { borderColor: t.border, color: t.text }]}
              placeholderTextColor={t.textSecondary}
            />

            <Caption>Dates (YYYY-MM-DD)</Caption>
            <TextInput value={start} onChangeText={setStart} style={[styles.input, { borderColor: t.border, color: t.text }]} />
            <TextInput value={end} onChangeText={setEnd} style={[styles.input, { borderColor: t.border, color: t.text }]} />

            <Caption>Primary platform</Caption>
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

            <Caption>Kind</Caption>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {(['organic', 'paid'] as CampaignKind[]).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.chip, kind === k && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: kind === k ? t.accent : t.text }}>{k}</Caption>
                </Pressable>
              ))}
            </View>

            <Caption>Status</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
              {(['draft', 'active', 'paused', 'completed'] as CampaignStatus[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.chip, status === s && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: status === s ? t.accent : t.text }}>{s}</Caption>
                </Pressable>
              ))}
            </View>

            <Caption>Budget (USD, optional)</Caption>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholder="0"
              style={[styles.input, { borderColor: t.border, color: t.text }]}
              placeholderTextColor={t.textSecondary}
            />

            <Pressable
              onPress={() => {
                if (!name.trim()) {
                  Alert.alert('Name required');
                  return;
                }
                const budgetCents = budget.trim() === '' ? null : Math.round(Number(budget) * 100);
                if (budgetCents !== null && Number.isNaN(budgetCents)) {
                  Alert.alert('Invalid budget');
                  return;
                }
                repo.insertCampaign({
                  workspace_id: active.id,
                  name: name.trim(),
                  objective: objective.trim() || null,
                  start_date: start,
                  end_date: end,
                  platforms: JSON.stringify([platform]),
                  kpis: JSON.stringify(['impressions', 'engagements']),
                  budget_cents: budgetCents,
                  kind,
                  status,
                  results_notes: null,
                });
                setName('');
                setObjective('');
                setBudget('');
                refresh();
                setModal(false);
              }}
              style={[styles.cta, { backgroundColor: t.accent }]}>
              <Caption style={{ color: '#fff', fontWeight: '700' }}>Save</Caption>
            </Pressable>
          </ScrollView>
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  cta: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
