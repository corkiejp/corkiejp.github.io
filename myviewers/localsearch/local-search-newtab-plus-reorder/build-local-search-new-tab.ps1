param(
    [ValidateSet('chrome', 'firefox', 'both')]
    [string]$Target = 'both'
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) {
    $Root = (Get-Location).Path
}

Set-Location $Root

$DistDir = Join-Path $Root 'dist'
$PackagesDir = Join-Path $Root 'packages'
$ChromeManifest = Join-Path $Root 'manifest.json'
$FirefoxManifest = Join-Path $Root 'manifest-firefox.json'
$ChromeBackground = Join-Path $Root 'background.js'
$FirefoxBackground = Join-Path $Root 'background-firefox.js'

$SharedFiles = @(
    'newtab.html',
    'newtab.js',
    'options.html',
    'options.js',
    'redirect.html',
    'redirect.js',
    'shared.js',
	'notes.html',
	'notes.js'
)

function Ensure-CleanDirectory {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -Recurse -Force $Path
    }

    New-Item -ItemType Directory -Path $Path | Out-Null
}

function Copy-SharedContent {
    param([string]$DestinationRoot)

    foreach ($file in $SharedFiles) {
        $source = Join-Path $Root $file
        if (Test-Path $source) {
            Copy-Item $source -Destination (Join-Path $DestinationRoot $file) -Force
        }
    }

    $assetsSource = Join-Path $Root 'assets'
    if (Test-Path $assetsSource) {
        Copy-Item $assetsSource -Destination (Join-Path $DestinationRoot 'assets') -Recurse -Force
    }
}

function Get-VersionFromManifest {
    param([string]$ManifestPath)

    if (-not (Test-Path $ManifestPath)) {
        return 'dev'
    }

    try {
        $json = Get-Content $ManifestPath -Raw | ConvertFrom-Json
        if ($json.version) {
            return [string]$json.version
        }
    } catch {
    }

    return 'dev'
}

function Get-SevenZipPath {
    $candidates = @(
        (Get-Command 7z.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Get-Command 7za.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        'C:\Program Files\7-Zip\7z.exe',
        'C:\Program Files (x86)\7-Zip\7z.exe'
    ) | Where-Object { $_ -and (Test-Path $_) }

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }

    throw '7-Zip was not found. Install 7-Zip or add 7z.exe to PATH.'
}

function New-SevenZipArchive {
    param(
        [string]$SourceDirectory,
        [string]$ArchivePath,
        [string]$SevenZipExe
    )

    if (Test-Path $ArchivePath) {
        Remove-Item $ArchivePath -Force
    }

    Push-Location $SourceDirectory
    try {
        & $SevenZipExe a -tzip $ArchivePath .\* | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip failed creating archive: $ArchivePath"
        }
    }
    finally {
        Pop-Location
    }
}

function New-ChromeBuild {
    param([string]$SevenZipExe)

    $version = Get-VersionFromManifest -ManifestPath $ChromeManifest
    $chromeDir = Join-Path $DistDir 'chrome'
    Ensure-CleanDirectory $chromeDir
    Copy-SharedContent -DestinationRoot $chromeDir

    Copy-Item $ChromeManifest -Destination (Join-Path $chromeDir 'manifest.json') -Force
    Copy-Item $ChromeBackground -Destination (Join-Path $chromeDir 'background.js') -Force

    $zipPath = Join-Path $PackagesDir ("local-search-new-tab-chrome-v$version.zip")
    New-SevenZipArchive -SourceDirectory $chromeDir -ArchivePath $zipPath -SevenZipExe $SevenZipExe

    Write-Host 'Built Chrome package:' -ForegroundColor Green
    Write-Host "  $zipPath"
    Write-Host 'Chrome unpacked folder:' -ForegroundColor Green
    Write-Host "  $chromeDir"
}

function New-FirefoxBuild {
    param([string]$SevenZipExe)

    $version = Get-VersionFromManifest -ManifestPath $FirefoxManifest
    $firefoxDir = Join-Path $DistDir 'firefox'
    Ensure-CleanDirectory $firefoxDir
    Copy-SharedContent -DestinationRoot $firefoxDir

    Copy-Item $FirefoxManifest -Destination (Join-Path $firefoxDir 'manifest.json') -Force
    Copy-Item $FirefoxBackground -Destination (Join-Path $firefoxDir 'background-firefox.js') -Force

    $xpiPath = Join-Path $PackagesDir ("local-search-new-tab-firefox-v$version.xpi")
    New-SevenZipArchive -SourceDirectory $firefoxDir -ArchivePath $xpiPath -SevenZipExe $SevenZipExe

    Write-Host 'Built Firefox package:' -ForegroundColor Green
    Write-Host "  $xpiPath"
    Write-Host 'Firefox unpacked folder:' -ForegroundColor Green
    Write-Host "  $firefoxDir"
}

$SevenZipExe = Get-SevenZipPath
Ensure-CleanDirectory $DistDir
Ensure-CleanDirectory $PackagesDir

if ($Target -eq 'chrome' -or $Target -eq 'both') {
    New-ChromeBuild -SevenZipExe $SevenZipExe
}

if ($Target -eq 'firefox' -or $Target -eq 'both') {
    New-FirefoxBuild -SevenZipExe $SevenZipExe
}

Write-Host ''
Write-Host 'Using 7-Zip:' -ForegroundColor Cyan
Write-Host "  $SevenZipExe"
Write-Host 'Done.' -ForegroundColor Cyan
