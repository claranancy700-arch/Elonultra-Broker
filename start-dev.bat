@echo off
REM Start both backend and frontend servers
REM Run from the root project directory

echo.
echo ========================================
echo  Elon-Ultra - React SPA Dev Mode
echo ========================================
echo.
echo Starting backend (port 5001) and frontend (port 5173)...
echo.
echo.
echo After startup, open:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5001
echo.
echo Press Ctrl+C to stop both servers.
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev
