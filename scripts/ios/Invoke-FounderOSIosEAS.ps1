#Requires -Version 5.1
<#
.SYNOPSIS
  Runs eas-cli from apps/marketing-ios after loading and asserting Founder OS Apple identity.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
  [string[]]$EasArgs
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot

. (Join-Path $ScriptDir 'Set-FounderOSAppleEnvironment.ps1')
. (Join-Path $ScriptDir 'Assert-FounderOSAppleIdentity.ps1')

$IosAppRoot = $env:FOS_IOS_APP_ROOT
Push-Location $IosAppRoot
try {
  Write-Host "Running: npx eas-cli $($EasArgs -join ' ')" -ForegroundColor DarkGray
  & npx eas-cli @EasArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
