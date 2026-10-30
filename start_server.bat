@echo off
title NETFIX Local Dev Server
color 0A

echo =======================================================
echo          NETFIX LOCAL DEV SERVER & MONITOR
echo =======================================================
echo.
echo Local Web App:  http://localhost:3000
echo Live Monitor:   http://localhost:3000/logs
echo.
echo Press Ctrl + C to stop the server.
echo =======================================================
echo.

start http://localhost:3000
start http://localhost:3000/logs

python server.py
pause
