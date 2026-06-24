# WisperFlow — Windows Dependency Setup Script
# Run this from a PowerShell terminal inside the project root:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\install-windows-deps.ps1

Write-Host "▶ Checking Python installation..." -ForegroundColor Cyan

# 1. Verify Python is installed
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "✔ Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✘ Python was not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ (from python.org or Microsoft Store) and ensure 'Add Python to PATH' is checked." -ForegroundColor Yellow
    Exit 1
}

# 2. Setup Python virtual environment
Write-Host "`n▶ Setting up Python sidecar virtual environment..." -ForegroundColor Cyan
$VenvPath = Join-Path $PSScriptRoot "..\sidecar\.venv"

if (-not (Test-Path $VenvPath)) {
    & python -m venv $VenvPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✔ Created sidecar\.venv" -ForegroundColor Green
    } else {
        Write-Host "✘ Failed to create virtual environment." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "✔ sidecar\.venv already exists." -ForegroundColor Green
}

# 3. Install packages in venv
Write-Host "`n▶ Installing Python packages..." -ForegroundColor Cyan
$PipPath = Join-Path $VenvPath "Scripts\pip.exe"
$RequirementsPath = Join-Path $PSScriptRoot "..\sidecar\requirements.txt"

& $PipPath install --upgrade pip -q
& $PipPath install -r $RequirementsPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✔ Python dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✘ Failed to install Python dependencies." -ForegroundColor Red
    Exit 1
}

# 4. Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Whisprly Windows Setup Complete!" -ForegroundColor Green -Bold
Write-Host "========================================" -ForegroundColor Green
Write-Host "To run in development mode:"
Write-Host "  npm run tauri dev"
Write-Host "To build for production:"
Write-Host "  npm run tauri build"
Write-Host ""
