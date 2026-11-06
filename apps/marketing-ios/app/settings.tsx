import { Body, Caption, Title } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { ScreenChrome } from '@/components/ScreenChrome';
import { repo, ALL_PROVIDER_IDS } from '@/lib/data/repository';
import type { IntegrationProviderId, IntegrationState } from '@/lib/domain/types';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

const PROVIDER_LABEL: Record<IntegrationProviderId, string> = {
  instagram_meta: 'Instagram / Meta',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube_google: 'YouTube / Google',
  facebook: 'Facebook',
  x: 'X',
  google_analytics: 'Google Analytics',
  other: 'Other',
};

export default function SettingsScreen() {
  const t = useAppTheme();
  const { active } = useWorkspace();

  const rows = useMemo(() => {
    if (!active) return [];
    const list = repo.listIntegrations(active.id);
    const map = new Map(list.map((r) => [r.provider_id, r.state as IntegrationState]));
    return ALL_PROVIDER_IDS.map((pid) => ({
      id: pid,
      label: PROVIDER_LABEL[pid],
      state: map.get(pid) ?? ('not_configured' as IntegrationState),
    }));
  }, [active]);

  return (
      <ScreenChrome title="Settings" subtitle="Local-only · integrations are offline" showNavLinks={false}>
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Caption style={{ color: t.accent }}>← Back</Caption>
        </Pressable>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Title style={{ fontSize: 20, marginBottom: 12 }}>Integrations</Title>
          <Caption style={{ marginBottom: 12 }}>
            Providers are disconnected. Architecture supports future OAuth, tokens, sync, and normalization.
          </Caption>

          {rows.map((r) => (
            <AppCard key={r.id} style={{ marginBottom: 12 }}>
              <Body style={{ fontWeight: '700' }}>{r.label}</Body>
              <Caption style={{ marginTop: 4 }}>State: {r.state}</Caption>
            </AppCard>
          ))}

          <Title style={{ fontSize: 20, marginVertical: 12 }}>Data</Title>
          <Pressable
            onPress={async () => {
              if (!active) return;
              const json = repo.exportWorkspaceJson(active.id);
              const base = cacheDirectory;
              if (!base) {
                Alert.alert('Export unavailable', 'Cache directory not available on this platform.');
                return;
              }
              const path = `${base}marketing-export-${active.id}.json`;
              await writeAsStringAsync(path, json);
              await Sharing.shareAsync(path, { dialogTitle: 'Export marketing data' });
            }}
            style={[styles.btn, { backgroundColor: t.accent }]}>
            <Caption style={{ color: '#fff', fontWeight: '700' }}>Export JSON</Caption>
          </Pressable>
          <Caption style={{ marginTop: 8 }}>
            Creates a local file you can move off-device. No cloud upload.
          </Caption>

        </ScrollView>
      </ScreenChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});
