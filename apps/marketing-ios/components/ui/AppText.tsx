import { Text as RNText, StyleSheet, TextProps } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function Title({ children, style, ...rest }: TextProps) {
  const t = useAppTheme();
  return (
    <RNText style={[styles.title, { color: t.text }, style]} {...rest}>
      {children}
    </RNText>
  );
}

export function Body({ children, style, ...rest }: TextProps) {
  const t = useAppTheme();
  return (
    <RNText style={[styles.body, { color: t.text }, style]} {...rest}>
      {children}
    </RNText>
  );
}

export function Caption({ children, style, ...rest }: TextProps) {
  const t = useAppTheme();
  return (
    <RNText style={[styles.caption, { color: t.textSecondary }, style]} {...rest}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
});
