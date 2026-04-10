param(
    [ValidateSet("chrome", "firefox")]
    [string]$Browser
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = if ($Browser -eq "chrome") {
    Join-Path $root "manifest.chrome.json"
} else {
    Join-Path $root "manifest.firefox.json"
}

$target = Join-Path $root "manifest.json"

if (-not (Test-Path $source)) {
    Write-Error "Source manifest not found: $source"
    exit 1
}

Copy-Item $source $target -Force
Write-Host "Activated $Browser manifest:"
Write-Host "  $target"