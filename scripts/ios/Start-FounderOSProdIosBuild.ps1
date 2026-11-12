#Requires -Version 5.1
<#
.SYNOPSIS
  Placeholder for future App Store / production iOS builds — not wired in eas.json today.

.DESCRIPTION
  Founder OS marketing-ios currently defines development and preview-lab only.
  This script refuses to run until a dedicated production profile exists and you pass -ConfirmProduction.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [switch]$ConfirmProduction,
  [string]$Profile = 'production'
)

$ErrorActionPreference = 'Stop'

if (-not $ConfirmProduction) {
  throw 'Production iOS builds require -ConfirmProduction. No production build was started.'
}

$RepoRoot = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot '..') '..')).Path
$easPath = Join-Path (Join-Path (Join-Path $RepoRoot 'apps') 'marketing-ios') 'eas.json'
$eas = Get-Content $easPath -Raw | ConvertFrom-Json
if (-not $eas.build.$Profile) {
  throw "eas.json has no build profile '$Profile'. Add production config before using this script."
}

. (Join-Path $PSScriptRoot 'Set-FounderOSAppleEnvironment.ps1')
. (Join-Path $PSScriptRoot 'Assert-FounderOSAppleIdentity.ps1')

Write-Host '>>> Production build path is configured — still requires explicit approval each time.' -ForegroundColor Yellow
Write-Host '>>> Apple ID: robertdsicora@gmail.com' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'Invoke-FounderOSIosEAS.ps1') -EasArgs @(
  'build', '--platform', 'ios', '--profile', $Profile
)
