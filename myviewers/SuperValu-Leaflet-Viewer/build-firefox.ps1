param(
    [string]$SourceDir = ".",
    [string]$OutputDir = ".\\dist",
    [string]$Name = "firefox-supervalu-leaflet-viewer"
)

$ErrorActionPreference = "Stop"

$sourcePath = (Resolve-Path $SourceDir).Path
if (-not (Test-Path $sourcePath)) {
    throw "Source directory not found: $SourceDir"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
}

$buildRoot = Join-Path $env:TEMP ("svlv-firefox-" + [guid]::NewGuid().ToString())
New-Item -Path $buildRoot -ItemType Directory -Force | Out-Null

$excludePatterns = @(
    '*.ps1',
    'manifest.chrome.json',
    'dist\\*',
    '.git\\*',
    '.github\\*'
)

Get-ChildItem -Path $sourcePath -Recurse -File | Where-Object {
    $full = $_.FullName
    $exclude = $false

    foreach ($pattern in $excludePatterns) {
        if ($full -like (Join-Path $sourcePath $pattern)) {
            $exclude = $true
            break
        }
    }

    -not $exclude
} | ForEach-Object {
    $relative = $_.FullName.Substring($sourcePath.Length)
$relative = $relative -replace '^[\\/]+', ''
    $dest = Join-Path $buildRoot $relative
    $parent = Split-Path $dest -Parent
    if (-not (Test-Path $parent)) {
        New-Item -Path $parent -ItemType Directory -Force | Out-Null
    }
    Copy-Item $_.FullName $dest -Force
}

Copy-Item (Join-Path $sourcePath 'manifest.firefox.json') (Join-Path $buildRoot 'manifest.json') -Force

$xpiPath = Join-Path (Resolve-Path $OutputDir).Path ($Name + '.xpi')
$zipTemp = Join-Path (Resolve-Path $OutputDir).Path ($Name + '.zip')
if (Test-Path $xpiPath) { Remove-Item $xpiPath -Force }
if (Test-Path $zipTemp) { Remove-Item $zipTemp -Force }
Compress-Archive -Path (Join-Path $buildRoot '*') -DestinationPath $zipTemp -Force
Move-Item $zipTemp $xpiPath -Force

Remove-Item $buildRoot -Recurse -Force
Write-Host "Created Firefox package: $xpiPath"
