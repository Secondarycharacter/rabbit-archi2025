# Saves the last committed (HEAD) version of GLB models into backup/
# before you commit replacements. Keeps at most one previous copy per model.
#
# Usage (from repo root):
#   powershell -File metaverse/scripts/backup-models-before-commit.ps1
#   powershell -File metaverse/scripts/backup-models-before-commit.ps1 -Models Angji.glb,Jinju.glb

param(
    [string[]] $Models = @()
)

$ErrorActionPreference = "Stop"

function Write-GitHeadBlob {
    param(
        [string] $GitPath,
        [string] $DestPath
    )
    $hash = git rev-parse "HEAD:$GitPath" 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }
    $proc = Start-Process -FilePath git -ArgumentList @("cat-file", "blob", $hash) `
        -RedirectStandardOutput $DestPath -Wait -PassThru -NoNewWindow
    return $proc.ExitCode -eq 0
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$modelsDir = Join-Path $repoRoot "metaverse\assets\models"
$backupDir = Join-Path $modelsDir "backup"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Push-Location $repoRoot
try {
    if ($Models.Count -eq 0) {
        $staged = git diff --cached --name-only --diff-filter=ACM -- "metaverse/assets/models/*.glb"
        $unstaged = git diff --name-only --diff-filter=M -- "metaverse/assets/models/*.glb"
        $paths = @($staged + $unstaged | Where-Object { $_ -and $_ -notmatch "/backup/" } | Select-Object -Unique)
        $Models = $paths | ForEach-Object { Split-Path $_ -Leaf }
    }

    $trackedNames = Get-ChildItem $modelsDir -Filter "*.glb" -File | ForEach-Object { $_.Name }

    if ($Models.Count -eq 0) {
        Write-Host "No changed GLB models found. Pass -Models Angji.glb to back up a specific file."
    } else {
        foreach ($name in $Models) {
            if ($name -notmatch '\.glb$') {
                Write-Warning "Skip invalid model name: $name"
                continue
            }

            $gitPath = "metaverse/assets/models/$name"
            $null = git cat-file -e "HEAD:$gitPath" 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Skip $name (not in HEAD yet — first add)."
                continue
            }

            $dest = Join-Path $backupDir $name
            if (Write-GitHeadBlob -GitPath $gitPath -DestPath $dest) {
                Write-Host "Backed up HEAD -> backup/$name"
            } else {
                Write-Warning "Failed to back up $name"
            }
        }
    }

    Get-ChildItem $backupDir -Filter "*.glb" -File | ForEach-Object {
        if ($trackedNames -notcontains $_.Name) {
            Remove-Item $_.FullName -Force
            Write-Host "Removed orphan backup/$($_.Name)"
        }
    }
}
finally {
    Pop-Location
}
