@echo off
title Scanom Backend Startup

:: ─── Auto-request Admin rights if not already elevated ───────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator rights...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

color 0A
echo.
echo  ====================================================
echo    SCANOM BACKEND STARTUP
echo  ====================================================
echo.

:: ─── Step 1: Update WSL2 port forwarding ─────────────────────────────────────
echo  [1/3] Updating WSL2 port forwarding...
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo        WSL2 IP: %WSL_IP%
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=%WSL_IP%
echo        Port forwarding: OK
echo.

:: ─── Step 2: Show current Wi-Fi IP ───────────────────────────────────────────
echo  [2/3] Your current Wi-Fi IP:
ipconfig | findstr "IPv4"
echo.
echo  !! If the IP changed from last time, update:
echo     C:\Users\Jim Dejito\OneDrive\Desktop\Jim Codes\Thesis\Scanom\scanom-app\.env
echo     Set: EXPO_PUBLIC_API_URL=http://^<your-ip^>:8000
echo.

:: ─── Step 3: Launch backend in WSL2 ──────────────────────────────────────────
echo  [3/3] Starting FastAPI backend in WSL2...
echo        (Keep this window OPEN while using the app)
echo.
echo  ====================================================
echo.

wsl bash -c "source ~/scanom-ml-env/bin/activate && cd '/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/scanom-backend' && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo  Backend stopped. Press any key to close.
pause >nul
