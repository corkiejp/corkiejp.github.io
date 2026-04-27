$root = $PSScriptRoot
Set-Location $root

$version = '2.0.4'
$outDir = Join-Path $root 'dist'
$xpiPath = Join-Path $outDir "boards-cleaner-v$version-firefox.xpi"

$firefoxManifest = Join-Path $root 'firefox-manifest.json'
$activeManifest = Join-Path $root 'manifest.json'

Write-Host "Build root: $root"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (-not (Test-Path $firefoxManifest)) {
    Write-Error "firefox-manifest.json not found at $firefoxManifest"
    exit 1
}

if (Test-Path $xpiPath) {
    Remove-Item $xpiPath -Force
}

Copy-Item $firefoxManifest $activeManifest -Force

try {
    & 7z.exe a -tzip $xpiPath `
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
        throw "7z failed creating Firefox XPI"
    }

    Write-Host "Created Firefox package: $xpiPath"
}
finally {
    if (Test-Path $activeManifest) {
        Remove-Item $activeManifest -Force
    }
}