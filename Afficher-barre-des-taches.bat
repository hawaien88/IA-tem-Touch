@echo off
REM Double-cliquable : reaffiche la barre des taches Windows apres avoir ferme Chrome.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0show-taskbar.ps1"
