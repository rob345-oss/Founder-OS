import { palette } from './theme';

const tintColorLight = palette.light.accent;
const tintColorDark = palette.dark.accent;

const light = {
  text: palette.light.text,
  background: palette.light.bg,
  tint: tintColorLight,
  tabIconDefault: '#AEAEB2',
  tabIconSelected: tintColorLight,
  card: palette.light.card,
  secondary: palette.light.textSecondary,
  border: palette.light.border,
} as const;

const dark = {
  text: palette.dark.text,
  background: palette.dark.bg,
  tint: tintColorDark,
  tabIconDefault: '#636366',
  tabIconSelected: tintColorDark,
  card: palette.dark.card,
  secondary: palette.dark.textSecondary,
  border: palette.dark.border,
} as const;

export default {
  light,
  dark,
} as const;
