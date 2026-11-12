#Requires -Version 5.1
<#
.SYNOPSIS
  Safe non-billable checks for Founder OS Apple + Expo identity configuration.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path (Join-Path $ScriptDir '..') '..')).Path

. (Join-Path $ScriptDir 'Set-FounderOSAppleEnvironment.ps1')
. (Join-Path $ScriptDir 'Assert-FounderOSAppleIdentity.ps1')

Write-Host '--- Repo config (no network) ---' -ForegroundColor Cyan
& node (Join-Path $ScriptDir 'validate-founder-os-apple.mjs') --process-env
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '--- Expo CLI account (EAS login, not Apple ID) ---' -ForegroundColor Cyan
Push-Location $env:FOS_IOS_APP_ROOT
try {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $whoami = & npx eas-cli whoami 2>&1 | Out-String
  $ErrorActionPreference = $prevEap
  Write-Host $whoami
  $contract = Get-Content (Join-Path $ScriptDir 'founder-os-apple.contract.json') -Raw | ConvertFrom-Json
  if ($whoami -notmatch $contract.expo.account) {
    Write-Warning "Expected Expo account '$($contract.expo.account)' in eas whoami output."
  }
  Write-Host '--- EAS project ---' -ForegroundColor Cyan
  $ErrorActionPreference = 'Continue'
  & npx eas-cli project:info 2>&1 | Out-String | Write-Host
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host '--- Apple team visibility via EAS (device list) ---' -ForegroundColor Cyan
  Write-Host "EAS will use EXPO_APPLE_ID=$env:EXPO_APPLE_ID when Apple authentication is required."
  & npx eas-cli device:list 2>&1 | Out-String | Write-Host
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'device:list failed - Apple session may need interactive login as robertdsicora@gmail.com.'
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Validation complete (no build started).' -ForegroundColor Green
