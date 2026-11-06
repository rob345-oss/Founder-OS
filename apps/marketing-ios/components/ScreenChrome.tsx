import { useAppTheme } from '@/hooks/useAppTheme';
import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Caption, Title } from '@/components/ui/AppText';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';

export function ScreenChrome({
  title,
  subtitle,
  children,
  showNavLinks = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showNavLinks?: boolean;
}) {
  const t = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Title style={{ fontSize: 30 }}>{title}</Title>
            {subtitle ? (
              <Caption style={{ marginTop: 4 }}>{subtitle}</Caption>
            ) : null}
          </View>
          <WorkspaceSwitcher />
        </View>
        {showNavLinks ? (
          <View style={styles.links}>
            <Link href="/scorecard" asChild>
              <Pressable>
                <Caption style={{ color: t.accent, fontWeight: '600' }}>Scorecard</Caption>
              </Pressable>
            </Link>
            <Caption style={{ color: t.textSecondary }}> · </Caption>
            <Link href="/settings" asChild>
              <Pressable>
                <Caption style={{ color: t.accent, fontWeight: '600' }}>Settings</Caption>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});
