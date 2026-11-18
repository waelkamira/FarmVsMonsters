@echo off
setlocal
cd /d "%~dp0build"

if not exist "index.html" (
  echo Web export not found.
  echo In Godot, open Project ^> Export, choose Web, and export to build/index.html.
  pause
  exit /b 1
)

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher "py" was not found. Install Python 3, then try again.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:8000"
echo FARM VS MONSTERS is running locally in Chrome.
echo Keep this window open while testing. Press Ctrl+C to stop.
py -m http.server 8000 --bind 127.0.0.1
pause
