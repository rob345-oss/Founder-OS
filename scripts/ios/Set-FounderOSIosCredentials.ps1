#Requires -Version 5.1
<#
.SYNOPSIS
  Configures iOS build credentials for a Founder OS EAS profile (interactive).
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'preview-lab')]
  [string]$Profile = 'development'
)

$ErrorActionPreference = 'Stop'
Write-Host "Profile: $Profile — Apple login must use robertdsicora@gmail.com." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'Invoke-FounderOSIosEAS.ps1') -EasArgs @(
  'credentials:configure-build',
  '-p', 'ios',
  '-e', $Profile
)
