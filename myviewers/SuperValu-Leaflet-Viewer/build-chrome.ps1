param(
    [string]$SourceDir = ".",
    [string]$OutputDir = ".\\dist",
    [string]$Name = "supervalu-leaflet-viewer-chrome"
)

$ErrorActionPreference = "Stop"

$sourcePath = (Resolve-Path $SourceDir).Path
if (-not (Test-Path $sourcePath)) {
    throw "Source directory not found: $SourceDir"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
}

$buildRoot = Join-Path $env:TEMP ("svlv-chrome-" + [guid]::NewGuid().ToString())
New-Item -Path $buildRoot -ItemType Directory -Force | Out-Null

$excludePatterns = @(
    '*.ps1',
    'manifest.firefox.json',
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

Copy-Item (Join-Path $sourcePath 'manifest.chrome.json') (Join-Path $buildRoot 'manifest.json') -Force

$zipPath = Join-Path (Resolve-Path $OutputDir).Path ($Name + '.zip')
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $buildRoot '*') -DestinationPath $zipPath -Force

Remove-Item $buildRoot -Recurse -Force
Write-Host "Created Chrome package: $zipPath"
