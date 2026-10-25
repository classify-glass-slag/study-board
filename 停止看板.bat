@echo off
cd /d "%~dp0"

netstat -ano | findstr "LISTENING" | findstr :3099 >nul
if %errorlevel% equ 0 (
	echo [End] Servers has stopped...
	for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3099 ^| findstr LISTENING') do taskkill /PID %%a /F
) else (
	echo [Check] Servers has not started yet...
)

pause