/**
 * Founder OS marketing iOS tracks (Node/CJS — loaded by app.config.* on EAS).
 * TypeScript app code re-exports via app-tracks.ts.
 */

/** @typedef {'development' | 'lab'} FounderOsAppTrack */

const FOS_DEV_BUNDLE_ID = 'com.founderos.app.dev';
const FOS_LAB_BUNDLE_ID = 'com.founderos.app.lab';

const FOS_DEV_EAS_CHANNEL = 'development';
const FOS_LAB_EAS_CHANNEL = 'preview-lab';

const TG_BUNDLE_PREFIXES = ['com.titaniumguardian.', 'com.titanium.founderos'];
const TG_FORBIDDEN_EXPO_PROJECT_ID = '8e571169-1b49-4d9d-b466-9507ac05decf';

/** @param {string | undefined} raw */
function normalizeFounderOsTrack(raw) {
  const v = (raw ?? 'development').trim().toLowerCase();
  return v === 'lab' ? 'lab' : 'development';
}

/** @param {FounderOsAppTrack} track */
function trackIdentity(track) {
  if (track === 'lab') {
    return {
      track,
      displayName: 'Founder OS Lab',
      bundleIdentifier: FOS_LAB_BUNDLE_ID,
      androidPackage: FOS_LAB_BUNDLE_ID,
      scheme: 'founderos-lab',
      easChannel: FOS_LAB_EAS_CHANNEL,
    };
  }
  return {
    track,
    displayName: 'Founder OS Dev',
    bundleIdentifier: FOS_DEV_BUNDLE_ID,
    androidPackage: FOS_DEV_BUNDLE_ID,
    scheme: 'founderos-dev',
    easChannel: FOS_DEV_EAS_CHANNEL,
  };
}

module.exports = {
  FOS_DEV_BUNDLE_ID,
  FOS_LAB_BUNDLE_ID,
  FOS_DEV_EAS_CHANNEL,
  FOS_LAB_EAS_CHANNEL,
  TG_BUNDLE_PREFIXES,
  TG_FORBIDDEN_EXPO_PROJECT_ID,
  normalizeFounderOsTrack,
  trackIdentity,
};
