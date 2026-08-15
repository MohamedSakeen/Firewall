@echo off
title NetGuard AI - Startup Launcher
echo =================================================================
echo  NetGuard AI - Smart Firewall, IDS & IPS Setup & Startup Launcher
echo =================================================================
echo.

cd /d "%~dp0"

echo [1/3] Installing/Verifying Python Backend Dependencies...
cd backend
python -m pip install -r requirements.txt
cd ..

echo.
echo [2/3] Installing/Verifying React Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo [3/3] Launching Flask API Server and React SOC Dashboard...
start "NetGuard Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && python api/api.py"
start "NetGuard Frontend UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =================================================================
echo  NetGuard AI Systems Successfully Started!
echo  Backend API & WebSockets: http://localhost:5000
echo  React SOC Dashboard:      http://localhost:5173
echo =================================================================
pause
