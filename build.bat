@echo off
REM =====================================================================
REM  HF TC - Collection & Accounts Software
REM  ONE-CLICK Windows .exe builder
REM  Simply DOUBLE-CLICK this file (build.bat).
REM =====================================================================
setlocal
cd /d "%~dp0"

echo.
echo ==========================================================
echo   HF TC  -  Windows .exe Builder
echo ==========================================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo   Python nahi mila.
    echo.
    echo   Step 1: https://www.python.org/downloads/windows/ se Python 3.9+
    echo           install karein.
    echo   Step 2: Install ke waqt  "Add python.exe to PATH"  tick karein.
    echo   Step 3: Ye file dobara chalayein.
    echo.
    pause
    exit /b 1
)

echo   [1/2] PyInstaller check / install ...
python -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo.
    echo   PyInstaller install nahi ho saka. Internet connection check karein.
    echo.
    pause
    exit /b 1
)

echo.
echo   [2/2] .exe build ho rahi hai ... (1-3 minute)
echo.
python build_windows.py
set RC=%errorlevel%

echo.
if %RC% NEQ 0 (
    echo ==========================================================
    echo   BUILD FAIL  (code %RC%) - upar diya error dekhein.
    echo ==========================================================
    pause
    exit /b %RC%
)

echo ==========================================================
echo   BUILD KAMYAB
echo   Aap ki .exe file yahan hai:
echo       %~dp0dist\HFTC.exe
echo.
echo   HFTC.exe ko kisi bhi folder me copy kar ke
echo   double-click se chala sakte hain.
echo ==========================================================
echo.
explorer "%~dp0dist"
pause
exit /b 0
