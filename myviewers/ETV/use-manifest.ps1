param(
    [ValidateSet("chrome", "firefox")]
    [string]$Browser
)

$ErrorActionPreference = "Stop"

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = if ($Browser -eq "chrome") {
    Join-Path $root "chrome-manifest.json"
} else {
    Join-Path $root "firefox-manifest.json"
}

$target = Join-Path $root "manifest.json"

if (-not (Test-Path $source)) {
    throw "Source manifest not found: $source"
}

Copy-Item $source $target -Force
Write-Host "Activated $Browser manifest:"
Write-Host "  $target"