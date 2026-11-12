#Requires -Version 5.1
<#
.SYNOPSIS
  Loads Founder OS Apple Developer environment variables for the current PowerShell session only.

.DESCRIPTION
  Sets EXPO_APPLE_ID, APPLE_ID, EXPO_APPLE_TEAM_ID, and APPLE_TEAM_ID from
  scripts/ios/founder-os-apple.contract.json. Does not modify machine-wide env or global profiles.
  Dot-source this file: . .\scripts\ios\Set-FounderOSAppleEnvironment.ps1

.PARAMETER SkipProjectCheck
  Skip verifying apps/marketing-ios exists (for repo-wide tooling only).
#>
[CmdletBinding()]
param(
  [switch]$SkipProjectCheck
)

$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path (Join-Path $ScriptDir '..') '..')).Path
$ContractPath = Join-Path $ScriptDir 'founder-os-apple.contract.json'

if (-not (Test-Path -LiteralPath $ContractPath)) {
  throw "Missing Apple contract: $ContractPath"
}

$contract = Get-Content -LiteralPath $ContractPath -Raw | ConvertFrom-Json
$expectedAppleId = $contract.appleDeveloper.appleId
$expectedTeamId = $contract.appleDeveloper.teamId
$iosRel = $contract.paths.iosAppRelative
$IosAppRoot = Join-Path $RepoRoot $iosRel

function Test-ConflictingAppleEnv {
  param(
    [string]$Name,
    [string]$Expected,
    [switch]$CaseInsensitive
  )
  $current = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $current) { return }
  $match = if ($CaseInsensitive) {
    $current.Equals($Expected, [StringComparison]::OrdinalIgnoreCase)
  } else {
    $current -eq $Expected
  }
  if (-not $match) {
  throw @"
Founder OS Apple identity conflict.
  Variable: $Name
  Current:  $current
  Required: $Expected
Clear or fix the variable, then dot-source Set-FounderOSAppleEnvironment.ps1 again.
"@
  }
}

foreach ($key in @('EXPO_APPLE_ID', 'APPLE_ID')) {
  Test-ConflictingAppleEnv -Name $key -Expected $expectedAppleId -CaseInsensitive
}

foreach ($key in @('EXPO_APPLE_TEAM_ID', 'APPLE_TEAM_ID')) {
  Test-ConflictingAppleEnv -Name $key -Expected $expectedTeamId
}

foreach ($key in @('EXPO_APPLE_ID', 'APPLE_ID')) {
  $current = [Environment]::GetEnvironmentVariable($key, 'Process')
  if ($current) {
    $domain = ($current -split '@', 2)[1]
    foreach ($forbidden in $contract.forbiddenAppleIdEmailDomains) {
      if ($domain -and $domain.Equals($forbidden, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Variable $key uses forbidden email domain @$forbidden. Apple Developer login must use $expectedAppleId."
      }
    }
  }
}

$env:APPLE_ID = $expectedAppleId
$env:EXPO_APPLE_ID = $expectedAppleId
$env:APPLE_TEAM_ID = $expectedTeamId
$env:EXPO_APPLE_TEAM_ID = $expectedTeamId
$env:FOS_REPO_ROOT = $RepoRoot
$env:FOS_IOS_APP_ROOT = $IosAppRoot

if (-not $SkipProjectCheck) {
  if (-not (Test-Path -LiteralPath $IosAppRoot)) {
    throw "Founder OS iOS app not found at: $IosAppRoot (wrong repo root?)"
  }
  $easPath = Join-Path $IosAppRoot 'eas.json'
  if (-not (Test-Path -LiteralPath $easPath)) {
    throw "Missing eas.json in $IosAppRoot"
  }
}

Write-Host ''
Write-Host '=== Founder OS Apple environment (this session) ===' -ForegroundColor Cyan
Write-Host "  Apple Developer ID (use at Apple login prompts): $expectedAppleId"
Write-Host "  Apple Team ID:                                 $expectedTeamId ($($contract.appleDeveloper.teamNameHint))"
Write-Host "  Expo account (EAS login, not Apple):             $($contract.expo.account)"
Write-Host "  iOS app directory:                               $IosAppRoot"
Write-Host ''
Write-Host 'Note: Setting env vars does not authenticate with Apple. When EAS opens Apple login,' -ForegroundColor Yellow
Write-Host "      sign in as $expectedAppleId - not another Apple ID or your Expo email." -ForegroundColor Yellow
Write-Host ''
