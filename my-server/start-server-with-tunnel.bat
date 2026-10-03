@echo off
title Colyseus Server + Tunnel
echo ================================
echo   Starting Colyseus Server...
echo ================================
echo.

start "Colyseus Server" cmd /k "npm start"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo ================================
echo   Starting Tunnel...
echo ================================
echo.

ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no -R 80:localhost:2567 nokey@localhost.run

pause