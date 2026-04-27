$root = $PSScriptRoot
Set-Location $root

$version = '2.0.4'
$outDir = Join-Path $root 'dist'
$zipPath = Join-Path $outDir "boards-cleaner-v$version-chrome.zip"

$chromeManifest = Join-Path $root 'chrome-manifest.json'
$activeManifest = Join-Path $root 'manifest.json'

Write-Host "Build root: $root"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (-not (Test-Path $chromeManifest)) {
    Write-Error "chrome-manifest.json not found at $chromeManifest"
    exit 1
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Copy-Item $chromeManifest $activeManifest -Force

try {
    & 7z.exe a -tzip $zipPath `
        .\background.js `
        .\content.js `
        .\members.html `
        .\members.js `
        .\options.html `
        .\options.js `
        .\manifest.json `
        .\assets `
        .\themes `
        -xr!dist `
        -xr!Instructions

    if ($LASTEXITCODE -ne 0) {
        throw "7z failed creating Chrome ZIP"
    }

    Write-Host "Created Chrome package: $zipPath"
}
finally {
    if (Test-Path $activeManifest) {
        Remove-Item $activeManifest -Force
    }
}