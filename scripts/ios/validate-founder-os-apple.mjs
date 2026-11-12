#!/usr/bin/env node
/**
 * Non-billable local validation: Founder OS Apple + Expo identity vs repo config.
 * Usage: node scripts/ios/validate-founder-os-apple.mjs [--process-env]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const contractPath = join(__dirname, 'founder-os-apple.contract.json');
const iosRoot = join(repoRoot, 'apps', 'marketing-ios');

const checkProcessEnv = process.argv.includes('--process-env');

function fail(msg) {
  console.error(`[founder-os-apple] ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[founder-os-apple] OK: ${msg}`);
}

let contract;
try {
  contract = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (e) {
  fail(e instanceof Error ? e.message : 'Failed to read founder-os-apple.contract.json');
  process.exit(1);
}

const errors = [];

const appJsonPath = join(iosRoot, 'app.json');
const easJsonPath = join(iosRoot, 'eas.json');
const appConfigPath = join(iosRoot, 'app.config.ts');
const envContractPath = join(iosRoot, 'env.contract.json');

let appJson;
let easJson;
let envContract;
try {
  appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
  easJson = JSON.parse(readFileSync(easJsonPath, 'utf8'));
  envContract = JSON.parse(readFileSync(envContractPath, 'utf8'));
} catch (e) {
  errors.push(e instanceof Error ? e.message : 'Failed to read marketing-ios config');
}

const projectId = appJson?.expo?.extra?.eas?.projectId;
if (projectId !== contract.expo.projectId) {
  errors.push(`app.json projectId must be ${contract.expo.projectId} (got ${projectId ?? '(unset)'})`);
}
if (appJson?.expo?.owner !== contract.expo.account) {
  errors.push(`app.json owner must be ${contract.expo.account} (got ${appJson?.expo?.owner ?? '(unset)'})`);
}
if (appJson?.expo?.slug !== contract.expo.projectSlug) {
  errors.push(`app.json slug must be ${contract.expo.projectSlug}`);
}

for (const forbidden of contract.isolation.forbiddenExpoProjectIds ?? []) {
  if (projectId === forbidden) {
    errors.push(`projectId matches forbidden Titanium Guardian Expo project ${forbidden}`);
  }
}

const devEas = easJson?.build?.development;
if (!devEas?.developmentClient) {
  errors.push('eas.json development profile must set developmentClient: true');
}
if (devEas?.channel !== contract.tracks.development.easUpdateChannel) {
  errors.push(
    `eas.json development channel must be "${contract.tracks.development.easUpdateChannel}" (got "${devEas?.channel ?? ''}")`,
  );
}

const devTrack = envContract?.tracks?.development;
if (devTrack?.bundleIdentifier !== contract.tracks.development.bundleIdentifier) {
  errors.push('env.contract.json development bundleIdentifier mismatch');
}

let appConfigText = '';
try {
  appConfigText = readFileSync(appConfigPath, 'utf8');
} catch {
  errors.push('app.config.ts not found');
}

const teamMatch = appConfigText.match(/appleTeamId:\s*['"]([^'"]+)['"]/);
const teamInConfig = teamMatch?.[1];
if (teamInConfig !== contract.appleDeveloper.teamId) {
  errors.push(
    `app.config.ts appleTeamId must be ${contract.appleDeveloper.teamId} (got ${teamInConfig ?? '(unset)'})`,
  );
}

const bundleMatch = appConfigText.match(/bundleIdentifier:\s*id\.bundleIdentifier/);
if (!bundleMatch) {
  errors.push('app.config.ts must set ios.bundleIdentifier from track identity');
}

if (checkProcessEnv) {
  const expectedAppleId = contract.appleDeveloper.appleId;
  const expectedTeam = contract.appleDeveloper.teamId;

  for (const key of ['EXPO_APPLE_ID', 'APPLE_ID']) {
    const v = process.env[key];
    if (v && v.toLowerCase() !== expectedAppleId.toLowerCase()) {
      errors.push(`${key} is "${v}" but Founder OS requires ${expectedAppleId}`);
    }
  }

  for (const key of ['EXPO_APPLE_TEAM_ID', 'APPLE_TEAM_ID']) {
    const v = process.env[key];
    if (v && v !== expectedTeam) {
      errors.push(`${key} is "${v}" but Founder OS requires ${expectedTeam}`);
    }
  }

  for (const key of ['EXPO_APPLE_ID', 'APPLE_ID']) {
    const v = process.env[key];
    if (v) {
      const domain = v.split('@')[1]?.toLowerCase() ?? '';
      for (const forbidden of contract.forbiddenAppleIdEmailDomains ?? []) {
        if (domain === forbidden.toLowerCase()) {
          errors.push(`${key} uses forbidden domain @${forbidden} — use ${expectedAppleId} for Apple Developer`);
        }
      }
    }
  }
}

for (const e of errors) fail(e);
if (!process.exitCode) {
  ok(`Apple ID ${contract.appleDeveloper.appleId}, team ${contract.appleDeveloper.teamId}`);
  ok(`Expo @${contract.expo.account}/${contract.expo.projectSlug}`);
  ok(`Dev bundle ${contract.tracks.development.bundleIdentifier}`);
}
