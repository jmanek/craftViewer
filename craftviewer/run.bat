@echo off
rem craftViewer launcher for Windows - double click this file.
setlocal
cd /d "%~dp0"

set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY (where python >nul 2>nul && set PY=python)
if not defined PY (where python3 >nul 2>nul && set PY=python3)

if not defined PY goto :nopython

%PY% craftviewer.py %*
if errorlevel 1 pause
goto :eof

:nopython
echo.
echo   Python 3 was not found on this computer.
echo.
echo   craftViewer needs Python 3.8 or newer (no extra packages, standard library only).
echo   Install it from https://www.python.org/downloads/windows/ and tick
echo   "Add python.exe to PATH" during setup, then run this file again.
echo.
echo   Alternative: build a standalone craftviewer.exe once with
echo   build_exe.bat (needs Python + pip on that machine).
echo.
pause
