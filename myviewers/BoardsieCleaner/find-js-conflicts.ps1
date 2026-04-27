param(
    [string]$Path = ".\content.js"
)

if (-not (Test-Path $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

$lines = Get-Content -Path $Path
$findings = New-Object System.Collections.ArrayList

function Add-Finding {
    param(
        [string]$Type,
        [string]$Name,
        [object[]]$Hits
    )

    [void]$findings.Add([pscustomobject]@{
        Type  = $Type
        Name  = $Name
        Count = $Hits.Count
        Lines = ($Hits | ForEach-Object { $_.Line } | Sort-Object) -join ", "
        Code  = ($Hits | Select-Object -First 1).Text.Trim()
    })
}

function Group-And-Report {
    param(
        [array]$Matches,
        [string]$Type
    )

    $grouped = $Matches | Group-Object Name
    foreach ($group in $grouped) {
        if ($group.Count -gt 1) {
            Add-Finding -Type $Type -Name $group.Name -Hits $group.Group
        }
    }
}

$functionMatches = @()
$variableMatches = @()
$domReadyMatches = @()
$rafMatches = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $lineNumber = $i + 1
    $line = $lines[$i]
    $trim = $line.Trim()

    if ($trim -match '^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(') {
        $functionMatches += [pscustomobject]@{
            Name = $matches[1]
            Line = $lineNumber
            Text = $line
        }
    }

    if ($trim -match '^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=') {
        $variableMatches += [pscustomobject]@{
            Name = $matches[1]
            Line = $lineNumber
            Text = $line
        }
    }

    if ($trim -match "document\.addEventListener\(\s*['""]DOMContentLoaded['""]") {
        $domReadyMatches += [pscustomobject]@{
            Name = "document.DOMContentLoaded"
            Line = $lineNumber
            Text = $line
        }
    }

    if ($trim -match 'requestAnimationFrame\s*\(\s*checkIfStable\s*\)') {
        $rafMatches += [pscustomobject]@{
            Name = "requestAnimationFrame(checkIfStable)"
            Line = $lineNumber
            Text = $line
        }
    }
}

Group-And-Report -Matches $functionMatches -Type "Duplicate function"
Group-And-Report -Matches $variableMatches -Type "Duplicate variable name"
Group-And-Report -Matches $domReadyMatches -Type "Repeated DOMContentLoaded hook"
Group-And-Report -Matches $rafMatches -Type "Repeated stability loop call"

if ($findings.Count -eq 0) {
    Write-Host "No obvious duplicate declarations found in $Path" -ForegroundColor Green
    Write-Host "But this only checks line-based patterns, not logical duplicates." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Possible conflicts found in $Path" -ForegroundColor Yellow
Write-Host ""

$findings |
    Sort-Object Type, Name |
    Format-Table -AutoSize