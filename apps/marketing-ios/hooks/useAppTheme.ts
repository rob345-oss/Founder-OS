import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/theme';

export type AppPalette = (typeof palette)['light'];

export function useAppTheme(): AppPalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}
