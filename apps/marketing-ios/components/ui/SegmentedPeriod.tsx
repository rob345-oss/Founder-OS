import type { ReportingPeriod } from '@/lib/domain/types';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

import { Caption } from './AppText';

const OPTIONS: { key: ReportingPeriod; label: string }[] = [
  { key: 'daily', label: 'Day' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'quarterly', label: 'Quarter' },
];

export function SegmentedPeriod({
  value,
  onChange,
}: {
  value: ReportingPeriod;
  onChange: (p: ReportingPeriod) => void;
}) {
  const t = useAppTheme();
  return (
    <View style={[styles.row, { borderColor: t.border, backgroundColor: t.card }]}>
      {OPTIONS.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.segment,
              active && { backgroundColor: t.accentMuted },
            ]}>
            <Caption
              style={[
                styles.segmentLabel,
                { color: active ? t.accent : t.textSecondary },
              ]}>
              {o.label}
            </Caption>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentLabel: {
    fontWeight: '600',
  },
});
