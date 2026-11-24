@echo off
setlocal
cd /d "%~dp0"

python start_all.py
set "EXIT_CODE=%ERRORLEVEL%"

endlocal & exit /b %EXIT_CODE%
