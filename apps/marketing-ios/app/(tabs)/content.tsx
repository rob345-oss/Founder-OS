import { ScreenChrome } from '@/components/ScreenChrome';
import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { repo } from '@/lib/data/repository';
import type { ContentStatus, MarketingPlatform } from '@/lib/domain/types';
import { toISODate } from '@/lib/domain/date';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
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

const STATUSES: ContentStatus[] = [
  'idea',
  'drafting',
  'ready',
  'scheduled',
  'published',
  'archived',
];

type ViewMode = 'list' | 'calendar';

export default function ContentScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();
  const { content, campaigns, refresh, workspaceId } = useWorkspaceData();
  const [mode, setMode] = useState<ViewMode>('list');
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<MarketingPlatform>('linkedin');
  const [status, setStatus] = useState<ContentStatus>('idea');
  const [planned, setPlanned] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof content>();
    for (const c of content) {
      const key = c.planned_date ?? c.published_date ?? 'unscheduled';
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a > b ? -1 : 1));
  }, [content]);

  if (!workspaceId || !active) {
    return (
      <ScreenChrome title="Content" subtitle="Pick a workspace">
        <View />
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome title="Content Planner" subtitle="Ideas → published (local schedule)">
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setMode('list')}
          style={[styles.toggle, mode === 'list' && { backgroundColor: t.accentMuted }]}>
          <Caption style={{ fontWeight: '600', color: mode === 'list' ? t.accent : t.text }}>List</Caption>
        </Pressable>
        <Pressable
          onPress={() => setMode('calendar')}
          style={[styles.toggle, mode === 'calendar' && { backgroundColor: t.accentMuted }]}>
          <Caption style={{ fontWeight: '600', color: mode === 'calendar' ? t.accent : t.text }}>Calendar</Caption>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setModal(true)} style={[styles.addBtn, { backgroundColor: t.accent }]}>
          <Caption style={{ color: '#fff', fontWeight: '700' }}>＋</Caption>
        </Pressable>
      </View>

      {mode === 'list' ? (
        <FlatList
          data={content}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AppCard style={{ marginBottom: 12 }}>
              <Body style={{ fontWeight: '700' }}>{item.title}</Body>
              <Caption>
                {item.platform} · {item.status}
              </Caption>
              <Caption>
                Planned {item.planned_date ?? '—'} · Published {item.published_date ?? '—'}
              </Caption>
              <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                {(['scheduled', 'published'] as ContentStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      repo.updateContent(item.id, {
                        status: s,
                        ...(s === 'published' ? { published_date: toISODate(new Date()) } : {}),
                      });
                      refresh();
                    }}
                    style={[styles.miniChip, { borderColor: t.border }]}>
                    <Caption>{s}</Caption>
                  </Pressable>
                ))}
              </View>
            </AppCard>
          )}
          ListEmptyComponent={<Caption style={{ padding: 24 }}>No content yet.</Caption>}
        />
      ) : (
        <FlatList
          data={byDate}
          keyExtractor={([k]) => k}
          contentContainerStyle={styles.list}
          renderItem={({ item: [date, items] }) => (
            <View style={{ marginBottom: 16 }}>
              <Title style={{ fontSize: 18, marginBottom: 8 }}>{date}</Title>
              {items.map((c) => (
                <AppCard key={c.id} style={{ marginBottom: 8 }}>
                  <Body style={{ fontWeight: '600' }}>{c.title}</Body>
                  <Caption>
                    {c.platform} · {c.status}
                  </Caption>
                </AppCard>
              ))}
            </View>
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: t.card }]}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}>
            <Title style={{ fontSize: 18 }}>New content</Title>
            <Caption>Scheduling is in-app only</Caption>

            <Caption style={{ marginTop: 12 }}>Title</Caption>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { borderColor: t.border, color: t.text }]}
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

            <Caption>Status</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
              {STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.chip, status === s && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: status === s ? t.accent : t.text }}>{s}</Caption>
                </Pressable>
              ))}
            </View>

            <Caption>Planned date (YYYY-MM-DD)</Caption>
            <TextInput
              value={planned}
              onChangeText={setPlanned}
              placeholder={toISODate(new Date())}
              style={[styles.input, { borderColor: t.border, color: t.text }]}
              placeholderTextColor={t.textSecondary}
            />

            <Caption>Optional campaign</Caption>
            <ScrollView horizontal style={{ marginVertical: 8 }}>
              <Pressable
                onPress={() => setCampaignId(null)}
                style={[styles.chip, campaignId === null && { backgroundColor: t.accentMuted }]}>
                <Caption style={{ color: campaignId === null ? t.accent : t.text }}>None</Caption>
              </Pressable>
              {campaigns.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCampaignId(c.id)}
                  style={[styles.chip, campaignId === c.id && { backgroundColor: t.accentMuted }]}>
                  <Caption style={{ color: campaignId === c.id ? t.accent : t.text }} numberOfLines={1}>
                    {c.name}
                  </Caption>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => {
                if (!title.trim()) {
                  Alert.alert('Title required');
                  return;
                }
                repo.insertContent({
                  workspace_id: active.id,
                  campaign_id: campaignId,
                  title: title.trim(),
                  description: null,
                  platform,
                  format: null,
                  pillar: null,
                  status,
                  planned_date: planned.trim() || null,
                  published_date: status === 'published' ? toISODate(new Date()) : null,
                  performance: null,
                });
                setTitle('');
                setPlanned('');
                setCampaignId(null);
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
  list: { padding: 20, paddingBottom: 120 },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toggle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  cta: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  miniChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
