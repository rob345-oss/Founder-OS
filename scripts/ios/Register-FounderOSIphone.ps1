#Requires -Version 5.1
<#
.SYNOPSIS
  Registers an iPhone with Apple Developer via EAS using the Founder OS Apple identity.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Write-Host 'Register device interactively — sign in to Apple as robertdsicora@gmail.com when prompted.' -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'Invoke-FounderOSIosEAS.ps1') -EasArgs @('device:create')
