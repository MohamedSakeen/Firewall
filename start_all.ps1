# Thin wrapper for the local-lab launcher. Run from anywhere.
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $rootDir
try {
    python start_all.py
}
finally {
    Pop-Location
}
