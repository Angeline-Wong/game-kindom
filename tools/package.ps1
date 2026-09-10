[CmdletBinding()]
param(
  [ValidateSet('web', 'android', 'all')]
  [string]$Target = 'web',
  [switch]$RunTests,
  [switch]$SkipTests,
  [switch]$InstallDependencies
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseDir = Join-Path $projectRoot 'release'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Invoke-Checked([string]$Command, [string[]]$Arguments) {
  Write-Host "$Command $($Arguments -join ' ')" -ForegroundColor DarkGray
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (exit code $LASTEXITCODE): $Command"
  }
}

Set-Location $projectRoot
Write-Host 'Zichen Chronicles packaging tool' -ForegroundColor Yellow
Write-Host "Project: $projectRoot"
Write-Host "Target: $Target"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found. Install the Node.js LTS release and try again.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm was not found. Make sure Node.js is available in PATH.'
}

if ($InstallDependencies -or -not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
  Write-Step 'Installing dependencies'
  Invoke-Checked 'npm' @('ci')
}

Write-Step 'Checking TypeScript'
Invoke-Checked 'npm' @('run', 'typecheck')

if ($RunTests -and -not $SkipTests) {
  Write-Step 'Running tests'
  Invoke-Checked 'npm' @('test', '--', '--run')
}

Write-Step 'Building web assets'
Invoke-Checked 'npm' @('run', 'build')

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

if ($Target -eq 'web' -or $Target -eq 'all') {
  Write-Step 'Packaging web version'
  $webArchive = Join-Path $releaseDir "zichen-chronicles-web-$stamp.zip"
  Compress-Archive -Path (Join-Path $projectRoot 'dist/*') -DestinationPath $webArchive -Force
  Write-Host "Web package: $webArchive" -ForegroundColor Green
}

if ($Target -eq 'android' -or $Target -eq 'all') {
  Write-Step 'Syncing Capacitor Android project'
  Invoke-Checked 'npx' @('cap', 'sync', 'android')

  $gradle = Join-Path $projectRoot 'android/gradlew.bat'
  if (-not (Test-Path $gradle)) {
    throw "Android Gradle Wrapper not found: $gradle"
  }
  if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) {
    throw 'Java was not found. Install JDK 17 or newer and set JAVA_HOME.'
  }

  Write-Step 'Building Android debug APK'
  Push-Location (Join-Path $projectRoot 'android')
  try {
    & $gradle 'assembleDebug'
    if ($LASTEXITCODE -ne 0) {
      throw "Gradle build failed (exit code $LASTEXITCODE)."
    }
  } finally {
    Pop-Location
  }

  $apk = Join-Path $projectRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
  if (-not (Test-Path $apk)) {
    throw "Gradle finished but the APK was not found: $apk"
  }
  $apkOutput = Join-Path $releaseDir "zichen-chronicles-debug-$stamp.apk"
  Copy-Item -LiteralPath $apk -Destination $apkOutput -Force
  Write-Host "Android package: $apkOutput" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Packaging completed.' -ForegroundColor Green
