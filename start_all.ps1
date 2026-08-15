# PowerShell Startup & Installation Script for Smart Firewall & SOC Suite
# Run as Administrator for raw packet sniffing privileges

$ROOT_DIR = $PSScriptRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " NetGuard AI - Smart Firewall, IDS & IPS Startup Script" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Step 1: Install & Verify Backend Dependencies
Write-Host "`n[1/3] Installing/Verifying Python Backend Dependencies..." -ForegroundColor Yellow
Set-Location -Path "$ROOT_DIR\backend"
python -m pip install -r requirements.txt

# Step 2: Install & Verify Frontend Dependencies
Write-Host "`n[2/3] Installing/Verifying React Frontend Dependencies..." -ForegroundColor Yellow
Set-Location -Path "$ROOT_DIR\frontend"
npm install

# Step 3: Launch Backend & Frontend Servers
Write-Host "`n[3/3] Launching Backend API (Port 5000) & Frontend Dashboard (Port 5173)..." -ForegroundColor Green

# Start Backend API in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT_DIR\backend'; Write-Host 'Starting Flask API Server on port 5000...' -ForegroundColor Cyan; python api/api.py"

# Start Frontend Vite Dev Server in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT_DIR\frontend'; Write-Host 'Starting React SOC Dashboard on port 5173...' -ForegroundColor Green; npm run dev"

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " NetGuard AI Systems Launched Successfully!" -ForegroundColor Green
Write-Host " API & WebSocket Server: http://localhost:5000" -ForegroundColor White
Write-Host " React SOC Dashboard UI: http://localhost:5173" -ForegroundColor White
Write-Host "=================================================================`n" -ForegroundColor Cyan
