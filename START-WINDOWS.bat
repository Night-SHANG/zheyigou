@echo off
setlocal
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 "scripts\serve.py"
  goto done
)
python --version >nul 2>&1
if not errorlevel 1 (
  python "scripts\serve.py"
  goto done
)
echo Python 3 was not found. Open index.html directly in your browser.
start "" "%~dp0index.html"
:done
echo The game server has stopped.
pause
