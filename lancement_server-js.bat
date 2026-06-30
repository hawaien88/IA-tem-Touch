@echo off
TITLE IA.tem
if not "%1" == "max" start /MAX cmd /c "%~f0" max & exit/b

rem Se place dans le dossier du script (quel que soit l'endroit d'installation), puis dans atem-control
cd /d "%~dp0atem-control"
node server.js
pause