# Scanom Backend Startup Script
# Run this as Administrator every time you restart your PC
# Right-click → "Run with PowerShell" (must be Admin)

Write-Host "=== Scanom Startup ===" -ForegroundColor Green

# 1. Update WSL2 port forwarding
Write-Host "`nUpdating WSL2 port forwarding..." -ForegroundColor Yellow
$wslIP = (wsl hostname -I).Trim()
Write-Host "  WSL2 IP: $wslIP"

netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$wslIP
Write-Host "  Port forwarding: OK" -ForegroundColor Green

# 2. Show your current Wi-Fi IP
Write-Host "`nYour Wi-Fi IP addresses:" -ForegroundColor Yellow
ipconfig | Select-String "IPv4"

Write-Host "`n=> If your IP changed, update scanom-app\.env" -ForegroundColor Cyan
Write-Host "   EXPO_PUBLIC_API_URL=http://<your-ip>:8000`n" -ForegroundColor Cyan

# 3. Start the backend in WSL2
Write-Host "Starting backend in WSL2..." -ForegroundColor Yellow
Write-Host "(A new Ubuntu window will open — keep it running)`n" -ForegroundColor Gray

wsl bash -c "source ~/scanom-ml-env/bin/activate && cd '/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/scanom-backend' && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
