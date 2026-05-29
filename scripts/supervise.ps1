# supervise.ps1 - Shadow Scan supervisor watchdog (Windows / PowerShell)
# Run in a SECOND terminal. Watches git HEAD; on each new commit runs the full
# verification gate and writes results to REVIEW.md at the repo root.
#
# Usage:   pwsh -File scripts/supervise.ps1            # watch mode (default)
#          pwsh -File scripts/supervise.ps1 -Once      # run once and exit
#          pwsh -File scripts/supervise.ps1 -IntervalSeconds 30

param(
    [switch]$Once,
    [int]$IntervalSeconds = 15
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root
$reviewFile = Join-Path $root "REVIEW.md"
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

function Run-Check($label, $cmd) {
    $out = Invoke-Expression "$cmd 2>&1" | Out-String
    $ok = ($LASTEXITCODE -eq 0)
    return [pscustomobject]@{ Label = $label; Ok = $ok; Output = $out.Trim() }
}

function Run-Gate {
    $commit = (git rev-parse --short HEAD).Trim()
    $msg    = (git log -1 --pretty=%s).Trim()
    $stamp  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Host "[$stamp] Reviewing commit $commit - $msg" -ForegroundColor Cyan

    $checks = @(
        (Run-Check "rustfmt" "cargo fmt --manifest-path src-tauri/Cargo.toml -- --check"),
        (Run-Check "clippy"  "cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings"),
        (Run-Check "check"   "cargo check  --manifest-path src-tauri/Cargo.toml"),
        (Run-Check "test"    "cargo test   --manifest-path src-tauri/Cargo.toml"),
        (Run-Check "tsc"     "npx tsc --noEmit"),
        (Run-Check "build"   "npm run build")
    )

    $failed = @($checks | Where-Object { -not $_.Ok })
    $verdict = if ($failed.Count -eq 0) { "PASS OK" } else { "FAIL ($($failed.Count) check(s))" }

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("# Shadow Scan - Supervisor Review")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("**Commit:** ``$commit`` - $msg  ")
    [void]$sb.AppendLine("**Reviewed:** $stamp  ")
    [void]$sb.AppendLine("**Verdict:** $verdict")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| Check | Result |")
    [void]$sb.AppendLine("|---|---|")
    foreach ($c in $checks) {
        $r = if ($c.Ok) { "PASS" } else { "FAIL" }
        [void]$sb.AppendLine("| $($c.Label) | $r |")
    }
    [void]$sb.AppendLine("")
    if ($failed.Count -gt 0) {
        [void]$sb.AppendLine("## Failures")
        foreach ($f in $failed) {
            [void]$sb.AppendLine("")
            [void]$sb.AppendLine("### $($f.Label)")
            [void]$sb.AppendLine('```')
            $tail = ($f.Output -split "`n" | Select-Object -Last 60) -join "`n"
            [void]$sb.AppendLine($tail)
            [void]$sb.AppendLine('```')
        }
    } else {
        [void]$sb.AppendLine("All checks passed. Nothing to fix.")
    }

    Set-Content -Path $reviewFile -Value $sb.ToString() -Encoding UTF8
    Write-Host "  -> $verdict  (written to REVIEW.md)" -ForegroundColor (if ($failed.Count -eq 0) {'Green'} else {'Red'})
    return $commit
}

if ($Once) { Run-Gate | Out-Null; exit 0 }

Write-Host "Supervisor watching $root (Ctrl+C to stop)..." -ForegroundColor Yellow
$last = ""
while ($true) {
    $head = (git rev-parse --short HEAD 2>$null).Trim()
    if ($head -and $head -ne $last) {
        $last = Run-Gate
    }
    Start-Sleep -Seconds $IntervalSeconds
}
