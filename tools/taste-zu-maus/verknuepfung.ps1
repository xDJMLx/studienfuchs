# Legt eine Desktop-Verknuepfung "Taste zu Maus" an (startet app.py ohne Konsolenfenster).
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

$exe = Join-Path $dir 'dist\TasteZuMaus.exe'
if (Test-Path $exe) {
    $target = $exe
    $arguments = ''
} else {
    $target = (Get-Command pythonw.exe -ErrorAction Stop).Source
    $arguments = '"' + (Join-Path $dir 'app.py') + '"'
}

$desktop = [Environment]::GetFolderPath('Desktop')
$path = Join-Path $desktop 'Taste zu Maus.lnk'
$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($path)
$lnk.TargetPath = $target
$lnk.Arguments = $arguments
$lnk.WorkingDirectory = $dir
$lnk.IconLocation = (Join-Path $dir 'icon.ico')
$lnk.Description = 'Taste halten - Maustaste haelt mit'
$lnk.Save()
Write-Host "Verknuepfung erstellt: $path"
