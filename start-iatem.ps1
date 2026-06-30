# =====================================================================
#  Lanceur unique IA.tem (portable)
#  1) Masque la barre des taches (API Windows native, sans .exe tiers)
#  2) Demarre le serveur Node s'il ne tourne pas deja
#  3) Attend que le serveur reponde sur /ping (evite la page 404 au boot)
#  4) Ouvre Chrome en plein ecran, en fenetre d'application (sans onglets)
#
#  A placer dans le dossier shell:startup (via le raccourci .bat) pour un
#  demarrage automatique. Aucun chemin absolu : fonctionne ou qu'il soit copie.
# =====================================================================

$ErrorActionPreference = 'SilentlyContinue'

$root      = $PSScriptRoot
$serverDir = Join-Path $root 'atem-control'
$url       = 'http://localhost:3000/'

# --- 1) Masquer la barre des taches (Shell_TrayWnd + ecrans secondaires) ---
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IatemWin {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")] public static extern int ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
function Set-Taskbar([int]$cmd) {
  foreach ($cls in @('Shell_TrayWnd', 'Shell_SecondaryTrayWnd')) {
    $h = [IatemWin]::FindWindow($cls, $null)
    if ($h -ne [IntPtr]::Zero) { [IatemWin]::ShowWindow($h, $cmd) | Out-Null }
  }
}
Set-Taskbar 0   # 0 = SW_HIDE

# --- 2) Demarrer le serveur Node s'il n'est pas deja lance ---
$already = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
           Where-Object { $_.CommandLine -like '*server.js*' }
if (-not $already) {
  Start-Process -FilePath 'node' -ArgumentList 'server.js' `
                -WorkingDirectory $serverDir -WindowStyle Hidden
}

# --- 3) Attendre que le serveur reponde (max ~30 s) au lieu d'un delai fixe ---
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $r = Invoke-WebRequest -Uri ($url + 'ping') -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

# --- 4) Localiser Chrome (registre + emplacements courants), puis l'ouvrir ---
$chrome = $null
$candidates = @(
  (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -EA SilentlyContinue).'(default)',
  (Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -EA SilentlyContinue).'(default)',
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
foreach ($c in $candidates) {
  if ($c -and (Test-Path $c)) { $chrome = $c; break }
}

if ($chrome) {
  Start-Process $chrome -ArgumentList @(
    "--app=$url",
    '--start-fullscreen',
    '--disable-session-crashed-bubble',
    '--no-first-run',
    '--no-default-browser-check'
  )
} else {
  # Chrome introuvable : on retablit la barre des taches et on previent clairement l'operateur
  Set-Taskbar 5
  (New-Object -ComObject WScript.Shell).Popup(
    "Google Chrome est introuvable.`r`n`r`nInstallez Chrome puis relancez 'Demarrer-IAtem.bat'.`r`n(Le serveur, lui, tourne deja : http://localhost:3000)",
    0, "IA.tem - Google Chrome requis", 0x30) | Out-Null
}
