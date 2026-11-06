import { useAppTheme } from '@/hooks/useAppTheme';
import { StyleSheet, View } from 'react-native';

export function ProgressBar({ value }: { value: number }) {
  const t = useAppTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: t.border }]}>
      <View style={[styles.fill, { width: `${v * 100}%`, backgroundColor: t.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
