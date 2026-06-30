@echo off
REM Double-cliquable : lance le serveur + Chrome plein ecran, barre des taches masquee.
REM Le -ExecutionPolicy Bypass evite tout reglage PowerShell prealable.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-iatem.ps1"
