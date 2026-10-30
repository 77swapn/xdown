@echo off
setlocal enabledelayedexpansion
title NETFIX - Auto Sync & Dev Server
color 0C

echo =======================================================
echo                 NETFIX AUTO-PILOT
echo =======================================================
echo.
echo [1/4] Scanning Google Drive for newly added or deleted movies...
python sync_catalog.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to scan Google Drive. Please check internet connection.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Staging and committing changes to Git...
git add catalog.json index.html config.js
git commit -m "Auto-sync catalog from Google Drive [%date% %time%]"

echo.
echo [3/4] Pushing updates to GitHub Pages...
git push origin main

echo.
echo =======================================================
echo [SUCCESS] Catalog synced and deployed live to GitHub!
echo =======================================================
echo.
echo [4/4] Starting Local Dev Server & Telemetry Monitor...
echo.
echo   Local Web App:  http://localhost:3000
echo   Live Monitor:   http://localhost:3000/logs
echo.
echo Press Ctrl + C anytime in this window to stop the server.
echo =======================================================
echo.

:: Automatically open browser tabs for developer convenience
start http://localhost:3000
start http://localhost:3000/logs

:: Run the local dev server & monitor (keeps running)
python server.py
