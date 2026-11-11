@echo off
title Bank Resilience Map - lokal server
cd /d "%~dp0"

where npm >NUL 2>NUL
if errorlevel 1 (
  echo Fant ikke Node.js. Installer LTS-versjonen fra https://nodejs.org og prov igjen.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installerer pakker forste gang ...
  call npm install
  if errorlevel 1 (
    echo npm install feilet. Se meldingen over.
    pause
    exit /b 1
  )
)

rem Stopp en eventuell gammel server som allerede bruker port 5173.
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Write-Host ('Stopper gammel server (prosess ' + $_ + ') ...'); Stop-Process -Id $_ -Force }"

echo Starter Bank Resilience Map. Appen apnes i nettleseren.
echo Lukk dette vinduet for a stoppe serveren.
echo.
call npm run dev -- --open --port 5173 --strictPort
pause
