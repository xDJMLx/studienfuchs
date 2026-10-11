@echo off
rem Installiert die Abhaengigkeit und legt die Desktop-Verknuepfung an.
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Python wurde nicht gefunden.
    echo Bitte von https://www.python.org/downloads/ installieren
    echo und dabei "Add python.exe to PATH" ankreuzen. Danach diese Datei erneut starten.
    pause
    exit /b 1
)

echo Installiere pynput ...
python -m pip install --upgrade -r requirements.txt
if errorlevel 1 (
    echo Installation fehlgeschlagen.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verknuepfung.ps1"
if errorlevel 1 (
    echo Die Verknuepfung konnte nicht erstellt werden.
    pause
    exit /b 1
)

echo.
echo Fertig. Auf dem Desktop liegt jetzt "Taste zu Maus".
pause
