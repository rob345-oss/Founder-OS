import type { ConfigContext, ExpoConfig } from 'expo/config';

import { normalizeFounderOsTrack, trackIdentity } from './lib/config/app-tracks.cjs';

/**
 * Dual-track iOS marketing app (Dev + Lab). Bundle IDs and display names come from
 * EXPO_PUBLIC_FOS_APP_TRACK — set per EAS profile in eas.json (not at runtime on device).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const track = normalizeFounderOsTrack(process.env.EXPO_PUBLIC_FOS_APP_TRACK);
  const id = trackIdentity(track);

  return {
    ...config,
    name: id.displayName,
    slug: 'founder-os-marketing',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: id.scheme,
    userInterfaceStyle: 'automatic',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: `https://u.expo.dev/f29123e5-7119-46f0-8eb3-05f7f8824048`,
      fallbackToCacheTimeout: 0,
    },
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: id.bundleIdentifier,
      /** Must match scripts/ios/founder-os-apple.contract.json */
      appleTeamId: 'T3KM8V39H7',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...config.android,
      package: id.androidPackage,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      ...(track === 'development' ? (['expo-dev-client'] as const) : []),
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      eas: {
        ...(config.extra && typeof config.extra === 'object' && 'eas' in config.extra
          ? (config.extra as { eas?: Record<string, unknown> }).eas
          : undefined),
        projectId: 'f29123e5-7119-46f0-8eb3-05f7f8824048',
      },
      fosAppTrack: track,
      fosEasChannel: id.easChannel,
      /** API base — public; auth uses Supabase anon + user JWT only (no service role). */
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  };
};
