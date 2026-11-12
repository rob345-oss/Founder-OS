#!/usr/bin/env node
/**
 * Local validation for Founder OS marketing iOS env + eas.json isolation (no network).
 * Usage: node scripts/validate-mobile-env.mjs [--profile development|preview-lab]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');

const FOS_DEV_BUNDLE = 'com.founderos.app.dev';
const FOS_LAB_BUNDLE = 'com.founderos.app.lab';
const TG_PROJECT_ID = '8e571169-1b49-4d9d-b466-9507ac05decf';

const profileArg = process.argv.includes('--profile')
  ? process.argv[process.argv.indexOf('--profile') + 1]
  : null;

function fail(msg) {
  console.error(`[founder-os-mobile] ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`[founder-os-mobile] warning: ${msg}`);
}

let contract;
let eas;
try {
  contract = JSON.parse(readFileSync(join(appRoot, 'env.contract.json'), 'utf8'));
  eas = JSON.parse(readFileSync(join(appRoot, 'eas.json'), 'utf8'));
} catch (e) {
  fail(e instanceof Error ? e.message : 'Failed to read contract or eas.json');
  process.exit(1);
}

const profiles = profileArg ? [profileArg] : ['development', 'preview-lab'];
const errors = [];
const warnings = [];

for (const profile of profiles) {
  const block = eas.build?.[profile];
  if (!block) {
    errors.push(`eas.json: missing build profile "${profile}".`);
    continue;
  }
  const env = block.env ?? {};
  const track = (env.EXPO_PUBLIC_FOS_APP_TRACK ?? '').trim().toLowerCase();
  const expected =
    profile === 'preview-lab'
      ? contract.tracks.lab
      : profile === 'development'
        ? contract.tracks.development
        : null;

  if (!expected) {
    warnings.push(`Unknown profile "${profile}" — skipped track checks.`);
    continue;
  }

  if (track !== expected.EXPO_PUBLIC_FOS_APP_TRACK) {
    errors.push(
      `${profile}: EXPO_PUBLIC_FOS_APP_TRACK must be "${expected.EXPO_PUBLIC_FOS_APP_TRACK}" (got "${track || '(unset)'}").`,
    );
  }

  const channel = block.channel ?? '';
  if (channel !== expected.easUpdateChannel) {
    errors.push(`${profile}: channel must be "${expected.easUpdateChannel}" (got "${channel || '(unset)'}").`);
  }

  const appEnv = (env.EXPO_PUBLIC_APP_ENV ?? '').trim().toLowerCase();
  if (appEnv !== expected.EXPO_PUBLIC_APP_ENV) {
    errors.push(
      `${profile}: EXPO_PUBLIC_APP_ENV must be "${expected.EXPO_PUBLIC_APP_ENV}" (got "${appEnv || '(unset)'}").`,
    );
  }

  for (const forbidden of contract.forbiddenInClient ?? []) {
    if (env[forbidden]) {
      errors.push(`${profile}: "${forbidden}" must not appear in eas.json env (client-leakable).`);
    }
  }

  if (env.EXPO_PUBLIC_IOS_BUNDLE_ID) {
    errors.push(`${profile}: do not set EXPO_PUBLIC_IOS_BUNDLE_ID — use app.config.ts + EXPO_PUBLIC_FOS_APP_TRACK.`);
  }

  const bundleHint =
    track === 'lab' ? FOS_LAB_BUNDLE : track === 'development' ? FOS_DEV_BUNDLE : expected.bundleIdentifier;
  for (const prefix of contract.isolation?.forbiddenBundleIdPrefixes ?? []) {
    if (bundleHint.startsWith(prefix)) {
      errors.push(`${profile}: bundle would match forbidden prefix "${prefix}".`);
    }
  }
}

let appJson;
try {
  appJson = JSON.parse(readFileSync(join(appRoot, 'app.json'), 'utf8'));
} catch {
  appJson = null;
}

if (appJson?.expo?.ios?.bundleIdentifier) {
  const bid = appJson.expo.ios.bundleIdentifier;
  if (bid === FOS_DEV_BUNDLE || bid === FOS_LAB_BUNDLE) {
    warnings.push(
      'app.json still sets bundleIdentifier — app.config.ts overrides at build time; consider removing stale value.',
    );
  } else if (bid !== 'com.founderos.marketing.commandcenter') {
    warnings.push(`app.json bundleIdentifier is "${bid}" — ensure app.config.ts is the source of truth.`);
  }
}

const projectId = appJson?.expo?.extra?.eas?.projectId ?? appJson?.expo?.extra?.projectId;
const expectedFosProjectId = contract.expectedExpoProjectId ?? null;

if (projectId === TG_PROJECT_ID) {
  errors.push('app.json extra.eas.projectId matches Titanium Guardian — create a new Expo project for Founder OS.');
}

for (const forbidden of contract.isolation?.forbiddenExpoProjectIds ?? []) {
  if (projectId === forbidden) {
    errors.push(`app.json extra.eas.projectId matches forbidden Expo project "${forbidden}".`);
  }
}

if (!projectId) {
  errors.push('app.json extra.eas.projectId is unset — run `eas init` for Founder OS marketing.');
} else if (expectedFosProjectId && projectId !== expectedFosProjectId) {
  errors.push(
    `app.json extra.eas.projectId must be "${expectedFosProjectId}" (got "${projectId}").`,
  );
}

for (const e of errors) fail(e);
for (const w of warnings) warn(w);

if (!process.exitCode) {
  console.log('[founder-os-mobile] validation OK:', profiles.join(', '));
}
