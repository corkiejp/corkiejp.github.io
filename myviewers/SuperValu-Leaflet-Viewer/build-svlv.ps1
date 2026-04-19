param(
    [Parameter(Position=0)]
    [ValidateSet("chrome", "firefox")]
    [string]$Target = "chrome",

    [string]$SourceDir = ".",
    [string]$OutputDir = ".\dist"
)

$ErrorActionPreference = "Stop"

$sourcePath = (Resolve-Path $SourceDir).Path
if (-not (Test-Path $sourcePath)) {
    throw "Source directory not found: $SourceDir"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
}

# Name + manifest per target
switch ($Target) {
    "chrome" {
        $name = "chrome-supervalu-leaflet-viewer"
        $manifestSource = "manifest.chrome.json"
        $ext = ".zip"
    }
    "firefox" {
        $name = "firefox-supervalu-leaflet-viewer"
        $manifestSource = "manifest.firefox.json"
        $ext = ".xpi"
    }
}

$buildRoot = Join-Path $env:TEMP ("svlv-$Target-" + [guid]::NewGuid().ToString())
New-Item -Path $buildRoot -ItemType Directory -Force | Out-Null

$excludePatterns = @(
    '*.ps1',
    'manifest.chrome.json',
    'manifest.firefox.json',
    'dist\*',
    '.git\*',
    '.github\*'
)

Get-ChildItem -Path $sourcePath -Recurse -File | Where-Object {
    $full = $_.FullName
    $relative = $full.Substring($sourcePath.Length) -replace '^[\\/]+' , ''

    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($relative -like $pattern) {
            $exclude = $true
            break
        }
    }

    -not $exclude
} | ForEach-Object {
    $full = $_.FullName
    $relative = $full.Substring($sourcePath.Length) -replace '^[\\/]+' , ''
    $dest = Join-Path $buildRoot $relative
    $parent = Split-Path $dest -Parent
    if (-not (Test-Path $parent)) {
        New-Item -Path $parent -ItemType Directory -Force | Out-Null
    }
    Copy-Item $full $dest -Force
}

# Drop correct manifest.json
Copy-Item (Join-Path $sourcePath $manifestSource) (Join-Path $buildRoot 'manifest.json') -Force

# Paths for output
$zipPath = Join-Path (Resolve-Path $OutputDir).Path ($name + '.zip')

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Use 7-Zip to create the archive from the contents of $buildRoot
Push-Location $buildRoot
try {
    # a = add, -tzip = zip format
    & 7z a -tzip $zipPath * | Out-Null
}
finally {
    Pop-Location
}

# For Firefox, rename .zip -> .xpi
if ($Target -eq 'firefox') {
    $xpiPath = Join-Path (Resolve-Path $OutputDir).Path ($name + '.xpi')
    if (Test-Path $xpiPath) { Remove-Item $xpiPath -Force }
    Rename-Item -Path $zipPath -NewName ($name + '.xpi')
    $packagePath = $xpiPath
} else {
    $packagePath = $zipPath
}

Remove-Item $buildRoot -Recurse -Force
Write-Host "Created $Target package: $packagePath"