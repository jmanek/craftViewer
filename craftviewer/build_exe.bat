@echo off
rem Builds a single-file craftviewer.exe (no Python needed to run it afterwards).
rem Needs Python 3 on the machine you build on. Run from anywhere.
setlocal
cd /d "%~dp0"

set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY (where python >nul 2>nul && set PY=python)
if not defined PY goto :nopython

echo Installing PyInstaller if needed...
%PY% -m pip install --upgrade pyinstaller || goto :failed

echo Building craftviewer.exe ...
%PY% -m PyInstaller --noconfirm --onefile --name craftviewer ^
  --add-data "static;static" ^
  --collect-submodules cv ^
  craftviewer.py || goto :failed

echo.
echo Done. The exe is in dist\craftviewer.exe
echo Copy it next to KSP.exe and run it there (it finds GameData by itself).
goto :eof

:nopython
echo Python 3 is required to BUILD the exe (it is not needed to run it).
pause
goto :eof

:failed
echo.
echo Build failed. See the messages above.
pause
