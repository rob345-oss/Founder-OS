/**
 * Founder OS marketing iOS tracks — must stay isolated from Titanium Guardian bundle IDs and EAS project.
 */

import tracks from './app-tracks.cjs';

export type FounderOsAppTrack = 'development' | 'lab';

export const FOS_DEV_BUNDLE_ID = tracks.FOS_DEV_BUNDLE_ID as string;
export const FOS_LAB_BUNDLE_ID = tracks.FOS_LAB_BUNDLE_ID as string;

export const FOS_DEV_EAS_CHANNEL = tracks.FOS_DEV_EAS_CHANNEL as string;
export const FOS_LAB_EAS_CHANNEL = tracks.FOS_LAB_EAS_CHANNEL as string;

export const TG_BUNDLE_PREFIXES = tracks.TG_BUNDLE_PREFIXES as readonly string[];
export const TG_FORBIDDEN_EXPO_PROJECT_ID = tracks.TG_FORBIDDEN_EXPO_PROJECT_ID as string;

export const normalizeFounderOsTrack = tracks.normalizeFounderOsTrack as (
  raw: string | undefined,
) => FounderOsAppTrack;

export const trackIdentity = tracks.trackIdentity as (track: FounderOsAppTrack) => {
  track: FounderOsAppTrack;
  displayName: string;
  bundleIdentifier: string;
  androidPackage: string;
  scheme: string;
  easChannel: string;
};
