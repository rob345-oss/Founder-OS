#Requires -Version 5.1
<#
.SYNOPSIS
  Ensures the current session has the correct Founder OS Apple env before EAS iOS commands.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$ContractPath = Join-Path $ScriptDir 'founder-os-apple.contract.json'
$contract = Get-Content -LiteralPath $ContractPath -Raw | ConvertFrom-Json

$expectedAppleId = $contract.appleDeveloper.appleId
$expectedTeamId = $contract.appleDeveloper.teamId

$required = @{
  EXPO_APPLE_ID        = $expectedAppleId
  APPLE_ID             = $expectedAppleId
  EXPO_APPLE_TEAM_ID   = $expectedTeamId
  APPLE_TEAM_ID        = $expectedTeamId
}

$missing = @()
foreach ($entry in $required.GetEnumerator()) {
  $actual = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
  if (-not $actual) {
    $missing += $entry.Key
    continue
  }
  $ok = if ($entry.Key -match 'APPLE_ID') {
    $actual.Equals($entry.Value, [StringComparison]::OrdinalIgnoreCase)
  } else {
    $actual -eq $entry.Value
  }
  if (-not $ok) {
    throw "Session $($entry.Key) is '$actual' but Founder OS requires '$($entry.Value)'. Dot-source Set-FounderOSAppleEnvironment.ps1 first."
  }
}

if ($missing.Count -gt 0) {
  throw @"
Founder OS Apple environment not loaded. Missing: $($missing -join ', ').
From repo root run:
  . .\scripts\ios\Set-FounderOSAppleEnvironment.ps1
"@
}

$validateScript = Join-Path $ScriptDir 'validate-founder-os-apple.mjs'
$repoRoot = (Resolve-Path (Join-Path (Join-Path $ScriptDir '..') '..')).Path
& node $validateScript --process-env
if ($LASTEXITCODE -ne 0) {
  throw 'validate-founder-os-apple.mjs failed'
}
