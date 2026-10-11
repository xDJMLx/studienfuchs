@echo off
rem Baut eine einzelne TasteZuMaus.exe (ohne Konsole) nach dist\ .
rem Danach Installieren.bat ausfuehren, dann zeigt die Verknuepfung auf die .exe.
cd /d "%~dp0"
python -m pip install --upgrade -r requirements.txt pyinstaller
if errorlevel 1 ( echo Installation fehlgeschlagen. & pause & exit /b 1 )
python -m PyInstaller --noconfirm --onefile --windowed --name TasteZuMaus --icon icon.ico --add-data "icon.ico;." app.py
if errorlevel 1 ( echo Bauen fehlgeschlagen. & pause & exit /b 1 )
echo.
echo Fertig: dist\TasteZuMaus.exe
pause
