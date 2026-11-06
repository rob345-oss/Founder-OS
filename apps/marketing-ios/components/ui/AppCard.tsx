import { useAppTheme } from '@/hooks/useAppTheme';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export function AppCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.border, shadowColor: t.text },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
});
