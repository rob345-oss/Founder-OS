# Founder OS iOS — Apple Developer environment (Windows / PowerShell)

Founder OS iOS builds and Apple Developer workflows must use:

| Role | Value |
| --- | --- |
| **Apple Developer ID** | `robertdsicora@gmail.com` |
| **Apple Team ID** | `T3KM8V39H7` |
| **Expo account** (EAS login, not Apple) | `robert_sicora` |
| **Expo project** | `founder-os-marketing` |

Canonical values live in `founder-os-apple.contract.json`.  
Environment variables do **not** log you into Apple; they tell EAS which Apple ID to use when a browser/login prompt appears.

## One command per new terminal session

From the **Founder OS repo root**:

```powershell
. .\scripts\ios\Set-FounderOSAppleEnvironment.ps1
```

Dot-sourcing loads `EXPO_APPLE_ID`, `APPLE_ID`, `EXPO_APPLE_TEAM_ID`, and `APPLE_TEAM_ID` for **this session only** (no global Windows changes).

## Safe validation (no billable build)

```powershell
.\scripts\ios\Test-FounderOSAppleConfiguration.ps1
```

## Common workflows

All of these load Apple env and assert identity before calling EAS:

```powershell
# Register a physical iPhone (interactive Apple login — use gmail Apple ID)
.\scripts\ios\Register-FounderOSIphone.ps1

# First-time or rotated signing credentials (development client)
.\scripts\ios\Set-FounderOSIosCredentials.ps1 -Profile development

# Development internal build (billable — only when you intend to build)
.\scripts\ios\Start-FounderOSDevIosBuild.ps1 -Wait

# Arbitrary eas-cli subcommand with guards
.\scripts\ios\Invoke-FounderOSIosEAS.ps1 -EasArgs @('device:list')
```

Production builds are **not** enabled in `eas.json` today.  
`Start-FounderOSProdIosBuild.ps1` refuses to run until a production profile exists and you pass `-ConfirmProduction`.

## Wrong Apple ID

If you previously signed into Apple with another ID in the EAS/Apple flow:

1. Stop — do not continue the build.
2. Dot-source `Set-FounderOSAppleEnvironment.ps1` again.
3. When the Apple login page opens, choose **robertdsicora@gmail.com** and team **T3KM8V39H7**.
4. Do not change Titanium Guardian credentials or Expo projects.

If `EXPO_APPLE_ID` or `APPLE_ID` is already set to a different value in your shell, `Set-FounderOSAppleEnvironment.ps1` **fails** instead of overwriting silently.

## Optional: global PowerShell profile

You may add the dot-source line to your **personal** `$PROFILE` if you want every PowerShell window preloaded.  
This repo does **not** modify your profile automatically.

## Node-only check (CI / cross-platform)

```bash
node scripts/ios/validate-founder-os-apple.mjs
node scripts/ios/validate-founder-os-apple.mjs --process-env
```
