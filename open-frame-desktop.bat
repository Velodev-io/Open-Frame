@echo off
setlocal enabledelayedexpansion

REM Open Frame Desktop Launcher (Windows)
REM Starts the server if needed and opens the app in a standalone window

cd /d "%~dp0"
set "APP_URL=http://localhost:3000"

REM Check if port 3000 is already listening
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Server is already running...
) else (
    echo Starting Open Frame server...
    start /min "Open Frame Server" cmd /c "npm run web"
    echo Waiting for server to start...
    timeout /t 3 /nobreak >nul
)

REM Try launching in app mode with Chrome or Edge, otherwise default browser
set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_EXE_X86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_EXE_64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME_EXE%" (
    echo Launching with Google Chrome...
    start "" "%CHROME_EXE%" --app=%APP_URL% --window-size=1400,900
) else if exist "%CHROME_EXE_X86%" (
    echo Launching with Google Chrome...
    start "" "%CHROME_EXE_X86%" --app=%APP_URL% --window-size=1400,900
) else if exist "%EDGE_EXE_64%" (
    echo Launching with Microsoft Edge...
    start "" "%EDGE_EXE_64%" --app=%APP_URL% --window-size=1400,900
) else if exist "%EDGE_EXE%" (
    echo Launching with Microsoft Edge...
    start "" "%EDGE_EXE%" --app=%APP_URL% --window-size=1400,900
) else (
    echo Opening in default browser...
    start "" "%APP_URL%"
)

echo.
echo Open Frame is running at %APP_URL%
echo.
endlocal
