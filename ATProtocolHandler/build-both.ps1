# build-both.ps1
$root = 'C:\Users\corki\Documents\website\browny-v1.0\ATProtocolHandler'
Set-Location $root

# Output names
$chromeZipName = 'ATProtocolHandler-chrome.zip'
$firefoxZipName = 'ATProtocolHandler-firefox.zip'
$firefoxXpiName = 'ATProtocolHandler.xpi'

# Clean old artifacts
Remove-Item $chromeZipName, $firefoxZipName, $firefoxXpiName -ErrorAction SilentlyContinue

# Common file/dir filters
function Get-IncludedFiles {
    Get-ChildItem -Path $root -File |
        Where-Object {
            # Exclude build scripts, docs, and non-manifest JSON you don't want packaged
            $_.Name -notin 'build-chrome-zip.ps1', 'build-xpi.ps1', 'build-both.ps1' -and
            $_.Name -notlike '*.md' -and
            $_.Name -notin 'input.html', 'index.html', 'sw.js', 'at-handler-helper.html' -and
            # Exclude all manifest variants; we add manifest.json explicitly per build
            $_.Name -notin 'manifest.json', 'manifest-firefox.json', 'manifest.chrome.json', 'manifest.chrome.backup.json' -and
            # Exclude any existing zips/xpis so they don't get bundled
            $_.Extension -notin '.zip', '.xpi'
        }
}

function Get-IncludedDirs {
    Get-ChildItem -Path $root -Directory |
        Where-Object {
            $_.Name -ne 'assets'
        }
}

# -------------------------
# 1. Build Chrome package
# -------------------------

$chromeManifestSource = Join-Path $root 'manifest.json'          # your Chrome manifest
$activeManifest = Join-Path $root 'manifest.json'

# Ensure Chrome manifest exists
if (-not (Test-Path $chromeManifestSource)) {
    Write-Error "Chrome manifest not found at $chromeManifestSource"
    exit 1
}

# For Chrome, we just use manifest.json as-is (no rename needed)
$chromeFiles = Get-IncludedFiles
$chromeDirs  = Get-IncludedDirs

# Create Chrome ZIP
Compress-Archive -Path ($chromeFiles + $chromeDirs + $activeManifest) -DestinationPath $chromeZipName -CompressionLevel Optimal
Write-Host "Created $chromeZipName in $root"

# -------------------------
# 2. Build Firefox package (.xpi)
# -------------------------

$firefoxManifestSource = Join-Path $root 'manifest-firefox.json'
$stagedManifest = Join-Path $root 'manifest.json'

if (-not (Test-Path $firefoxManifestSource)) {
    Write-Error "Firefox manifest not found at $firefoxManifestSource"
    exit 1
}

# Temporarily place Firefox manifest as manifest.json
# (back up existing Chrome manifest if needed)
$chromeManifestBackup = Join-Path $root 'manifest.chrome.backup.json'
Copy-Item $activeManifest $chromeManifestBackup -Force
Copy-Item $firefoxManifestSource $stagedManifest -Force

try {
    $firefoxFiles = Get-IncludedFiles
    $firefoxDirs  = Get-IncludedDirs

    # Create ZIP first
    Compress-Archive -Path ($firefoxFiles + $firefoxDirs + $stagedManifest) -DestinationPath $firefoxZipName -CompressionLevel Optimal

    # Rename/copy to .xpi
    Copy-Item $firefoxZipName $firefoxXpiName -Force
    Write-Host "Created $firefoxZipName and $firefoxXpiName in $root"
}
finally {
    # Restore original Chrome manifest
    if (Test-Path $chromeManifestBackup) {
        Copy-Item $chromeManifestBackup $stagedManifest -Force
        Remove-Item $chromeManifestBackup -ErrorAction SilentlyContinue
    }
}