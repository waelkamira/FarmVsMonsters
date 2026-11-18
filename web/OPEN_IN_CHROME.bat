@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required to run the browser game.
  echo Install it once from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS with npm included.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First launch: installing project dependencies...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

start "" "http://localhost:3000"
echo Starting FARM VS MONSTERS in local development mode...
echo Keep this window open while testing. Press Ctrl+C to stop.
call npm run dev
pause
