@echo off
REM =====================================================================
REM  HF TC - Collection & Accounts Software   (Windows launcher)
REM =====================================================================
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo   Python nahi mila.  Python 3.9+ install karein:
    echo   https://www.python.org/downloads/windows/
    echo.
    pause
    exit /b 1
)

if not exist data mkdir data
python main.py
if errorlevel 1 (
    echo.
    echo   Application error - upar diya gaya message dekhen.
    pause
)
