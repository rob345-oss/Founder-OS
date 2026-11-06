import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { ScreenChrome } from '@/components/ScreenChrome';
import { repo } from '@/lib/data/repository';
import { buildWeeklyScorecard, weekStartISO } from '@/lib/domain/scorecard';
import { datesInWeekAround } from '@/lib/domain/date';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Alert } from 'react-native';

export default function ScorecardScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();
  const { goals, metrics, content, refresh, workspaceId } = useWorkspaceData();
  const [wins, setWins] = useState('');
  const [obs, setObs] = useState('');
  const [evalPrev, setEvalPrev] = useState('');
  const [next, setNext] = useState('');

  const weekStart = useMemo(() => weekStartISO(), []);
  const { start: weekRangeStart, end: weekRangeEnd } = useMemo(
    () => datesInWeekAround(new Date()),
    []
  );
  const milestoneDue = workspaceId
    ? repo.countCampaignMilestonesDueInRange(workspaceId, weekRangeStart, weekRangeEnd)
    : 0;

  const card = useMemo(() => {
    if (!workspaceId) return null;
    return buildWeeklyScorecard(goals, metrics, content, milestoneDue);
  }, [goals, metrics, content, milestoneDue, workspaceId]);

  if (!workspaceId || !active || !card) {
    return (
      <ScreenChrome title="Scorecard" showNavLinks={false}>
        <Pressable onPress={() => router.back()} style={{ padding: 20 }}>
          <Caption style={{ color: t.accent }}>← Back</Caption>
        </Pressable>
        <View />
      </ScreenChrome>
    );
  }

  return (
      <ScreenChrome title="Weekly scorecard" subtitle={`Week of ${weekStart}`} showNavLinks={false}>
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Caption style={{ color: t.accent }}>← Back</Caption>
        </Pressable>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppCard>
            <Caption>Goals</Caption>
            <Body style={{ marginTop: 6 }}>
              Completed: {card.goalsCompleted} · On track: {card.goalsOnTrack} · Behind: {card.goalsBehind}
            </Body>
          </AppCard>

          <AppCard style={{ marginTop: 12 }}>
            <Caption>Content cadence</Caption>
            <Body style={{ marginTop: 6 }}>
              Planned vs published this week: {card.postsPlanned} / {card.postsPublished}
            </Body>
          </AppCard>

          <AppCard style={{ marginTop: 12 }}>
            <Caption>Audience & engagement</Caption>
            <Body style={{ marginTop: 6 }}>
              Follower change (week window): {card.audienceGrowth !== null ? card.audienceGrowth : '—'}
            </Body>
            <Body style={{ marginTop: 4 }}>Engagement trend: {card.engagementTrend}</Body>
            <Body style={{ marginTop: 4 }}>Leads (if logged): {card.leadsInWeek ?? '—'}</Body>
          </AppCard>

          <AppCard style={{ marginTop: 12 }}>
            <Caption>Campaign milestones due</Caption>
            <Body style={{ marginTop: 6 }}>{card.campaignMilestonesDue} this week</Body>
          </AppCard>

          <AppCard style={{ marginTop: 12 }}>
            <Caption>Composite consistency (optional)</Caption>
            <Body style={{ marginTop: 6 }}>
              {card.consistencyIndex !== null ? `${card.consistencyIndex}/100` : '—'}
            </Body>
            <Caption style={{ marginTop: 8 }}>
              Formula: 50% × min(1, published ÷ planned for the week) + 50% × share of active goals with
              progress ≥ elapsed time ratio − 0.1. Expand in product docs.
            </Caption>
          </AppCard>

          <Title style={{ fontSize: 20, marginTop: 24 }}>Review workflow</Title>
          <Caption>1. Review performance · 2. Wins · 3. Obstacles · 4. Prior goals · 5. Next week</Caption>

          <Caption style={{ marginTop: 12 }}>Wins</Caption>
          <TextInput
            value={wins}
            onChangeText={setWins}
            multiline
            style={[styles.area, { borderColor: t.border, color: t.text }]}
            placeholderTextColor={t.textSecondary}
          />
          <Caption>Obstacles</Caption>
          <TextInput
            value={obs}
            onChangeText={setObs}
            multiline
            style={[styles.area, { borderColor: t.border, color: t.text }]}
            placeholderTextColor={t.textSecondary}
          />
          <Caption>Previous goals evaluation</Caption>
          <TextInput
            value={evalPrev}
            onChangeText={setEvalPrev}
            multiline
            style={[styles.area, { borderColor: t.border, color: t.text }]}
            placeholderTextColor={t.textSecondary}
          />
          <Caption>Next week priorities</Caption>
          <TextInput
            value={next}
            onChangeText={setNext}
            multiline
            style={[styles.area, { borderColor: t.border, color: t.text }]}
            placeholderTextColor={t.textSecondary}
          />

          <Pressable
            onPress={() => {
              repo.upsertWeeklyReview({
                workspace_id: active.id,
                week_start: weekStart,
                wins,
                obstacles: obs,
                prev_goals_eval: evalPrev,
                next_priorities: next,
              });
              refresh();
              Alert.alert('Saved', 'Review stored locally.');
            }}
            style={[styles.save, { backgroundColor: t.accent }]}>
            <Caption style={{ color: '#fff', fontWeight: '700' }}>Save review</Caption>
          </Pressable>

          <Caption style={{ marginTop: 16, color: t.textSecondary }}>
            Past reviews stay in SQLite — export from Settings.
          </Caption>
        </ScrollView>
      </ScreenChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  area: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  save: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});
