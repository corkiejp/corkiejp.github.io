param(
    [ValidateSet("chrome", "firefox", "both")]
    [string]$Target = "both"
)

$ErrorActionPreference = "Stop"

$root            = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExtensionFolder = $root
$OutputFolder    = Join-Path $root "dist"

$ManifestChrome  = Join-Path $root "chrome-manifest.json"
$ManifestFirefox = Join-Path $root "firefox-manifest.json"
$ManifestActive  = Join-Path $root "manifest.json"

$SevenZipCandidates = @(
    "$env:ProgramFiles\7-Zip\7z.exe",
    "$env:ProgramFiles(x86)\7-Zip\7z.exe"
)

$SevenZip = $SevenZipCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $SevenZip) {
    $cmd = Get-Command 7z.exe -CommandType Application -ErrorAction SilentlyContinue
    if ($cmd) { $SevenZip = $cmd.Source }
}

if (-not $SevenZip) {
    throw "7-Zip not found. Install 7-Zip or add 7z.exe to PATH."
}

if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
}

function Build-Target {
    param(
        [Parameter(Mandatory)]
        [ValidateSet("chrome", "firefox")]
        [string]$Kind
    )

    $sourceManifest = if ($Kind -eq "chrome") {
        $ManifestChrome
    } else {
        $ManifestFirefox
    }

    if (-not (Test-Path $sourceManifest)) {
        throw "Source manifest not found: $sourceManifest"
    }

    Write-Host ""
    Write-Host "=== Building $Kind ==="

    Copy-Item $sourceManifest $ManifestActive -Force
    Write-Host "Activated manifest: $ManifestActive"

    $manifest = Get-Content -Raw -Path $ManifestActive | ConvertFrom-Json
    if (-not $manifest.version) {
        throw "manifest.json does not contain a version field."
    }

    $Version = [string]$manifest.version

    $BaseName = if ($Kind -eq "chrome") {
        "PV3-ETV5or10Viewer-chrome-v$Version"
    } else {
        "PV3-ETV5or10Viewer-firefox-v$Version"
    }

    $zipPath = Join-Path $OutputFolder ($BaseName + ".zip")
    $xpiPath = if ($Kind -eq "firefox") {
        Join-Path $OutputFolder ($BaseName + ".xpi")
    } else {
        $null
    }

    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    if ($xpiPath -and (Test-Path $xpiPath)) { Remove-Item $xpiPath -Force }

    Write-Host "Using 7-Zip:      $SevenZip"
    Write-Host "Manifest version: $Version"
    Write-Host "ZIP output:       $zipPath"
    if ($xpiPath) {
        Write-Host "XPI output:       $xpiPath"
    }

    Push-Location $ExtensionFolder
    try {
        $args = @(
            'a',
            '-tzip',
            '-mx=9',
            $zipPath,
            '.\*',
            '-xr!dist',
            '-xr!.git',
            '-xr!.github',
            '-xr!node_modules',
            '-xr!*.ps1'
        )

        & $SevenZip @args

        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }

    if ($xpiPath) {
        Copy-Item $zipPath $xpiPath -Force
        Write-Host "Firefox upload: $xpiPath"
    } else {
        Write-Host "Chrome upload:  $zipPath"
    }
}

switch ($Target) {
    "chrome"  { Build-Target -Kind "chrome" }
    "firefox" { Build-Target -Kind "firefox" }
    "both"    {
        Build-Target -Kind "chrome"
        Build-Target -Kind "firefox"
    }
}

# After building, restore Chrome manifest as the active one
if (Test-Path $ManifestChrome) {
    Copy-Item $ManifestChrome $ManifestActive -Force
    Write-Host ""
    Write-Host "Restored active manifest to Chrome (MV3) for local dev:"
    Write-Host "  $ManifestActive"
} else {
    Write-Host ""
    Write-Host "Warning: Chrome manifest not found at $ManifestChrome; active manifest left as-is."
}

Write-Host ""
Write-Host "Done."