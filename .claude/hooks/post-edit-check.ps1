# post-edit-check.ps1 - Claude Code PostToolUse hook (Windows / PowerShell)
# Runs a fast type/compile check on the file Claude just edited or wrote.
# Exit 0 = clean (silent). Exit 2 = problem; stderr is fed back to Claude so it
# fixes the breakage on the spot instead of plowing ahead.

$ErrorActionPreference = "Stop"

# Hook input arrives as JSON on stdin.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$file = $payload.tool_input.file_path
if (-not $file) { exit 0 }

# Resolve project root = where this hook lives, two levels up (.claude/hooks -> root)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

$ext = [System.IO.Path]::GetExtension($file).ToLower()

function Fail($label, $output) {
    Write-Error "[$label] failed for $file`n$output"
    exit 2
}

switch ($ext) {
    # Rust: fast type/borrow check only (no codegen) so the loop stays snappy.
    ".rs" {
        if ($file -notmatch "src-tauri") { exit 0 }
        $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
        $out = & cargo check --manifest-path src-tauri/Cargo.toml --message-format short 2>&1
        if ($LASTEXITCODE -ne 0) { Fail "cargo check" ($out -join "`n") }
    }
    # TypeScript / React: project-wide type check (no emit).
    { $_ -in ".ts", ".tsx" } {
        $out = & npx tsc --noEmit 2>&1
        if ($LASTEXITCODE -ne 0) { Fail "tsc --noEmit" ($out -join "`n") }
    }
    default { exit 0 }
}

exit 0
