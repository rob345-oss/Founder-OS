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
  $appleTeamId = $env:EXPO_APPLE_TEAM_ID
  $fullArgs = [System.Collections.Generic.List[string]]::new()
  $fullArgs.AddRange($EasArgs)
  if ($appleTeamId -and ($EasArgs -contains 'device:list') -and ($fullArgs -notcontains '--apple-team-id')) {
    $idx = $fullArgs.IndexOf('device:list')
    $fullArgs.Insert($idx + 1, '--apple-team-id')
    $fullArgs.Insert($idx + 2, $appleTeamId)
  }
  Write-Host "Running: npx eas-cli $($fullArgs -join ' ')" -ForegroundColor DarkGray
  & npx eas-cli @fullArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
