@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Schattennetz Hamburg  -  Push nach GitHub
echo ============================================
git add -A
git commit -m "Update via push.bat %date% %time%"
if errorlevel 1 echo (Nichts zu committen oder schon aktuell - pushe trotzdem.)
git push
echo.
echo Fertig. Coolify deployt jetzt (falls Auto-Deploy an ist).
pause
