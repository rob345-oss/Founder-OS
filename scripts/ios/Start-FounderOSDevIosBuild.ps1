#Requires -Version 5.1
<#
.SYNOPSIS
  Starts a billable EAS iOS development-client build for Founder OS Dev (after checks).

.PARAMETER Wait
  Pass --wait to eas build.
#>
[CmdletBinding()]
param(
  [switch]$Wait,
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot

. (Join-Path $ScriptDir 'Set-FounderOSAppleEnvironment.ps1')
. (Join-Path $ScriptDir 'Assert-FounderOSAppleIdentity.ps1')

Push-Location $env:FOS_IOS_APP_ROOT
try {
  npm run validate:env
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & node (Join-Path $ScriptDir 'validate-founder-os-apple.mjs') --process-env
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host ''
  Write-Host '>>> Starting EAS build profile [development] for com.founderos.app.dev' -ForegroundColor Green
  Write-Host '>>> At any Apple login prompt, use Apple ID: robertdsicora@gmail.com' -ForegroundColor Green
  Write-Host ''

  $args = @('build', '--platform', 'ios', '--profile', 'development')
  if ($Wait) { $args += '--wait' }
  if ($Message) { $args += @('--message', $Message) }

  & npx eas-cli @args
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
