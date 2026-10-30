@echo off
setlocal enabledelayedexpansion
title NETFIX Auto Catalog Sync
color 0C

echo =======================================================
echo                 NETFIX DRIVE SYNC
echo =======================================================
echo.
echo [1/3] Scanning Google Drive for newly added or deleted movies...
python sync_catalog.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to scan Google Drive. Please check internet connection.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Staging and committing changes to Git...
git add catalog.json index.html config.js
git commit -m "Auto-sync catalog from Google Drive [%date% %time%]"

echo.
echo [3/3] Pushing updates to GitHub Pages...
git push origin main

echo.
echo =======================================================
echo [SUCCESS] Your NETFIX app is 100%% synced and live!
echo =======================================================
echo.
pause
