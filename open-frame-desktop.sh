#!/bin/bash

# Open Frame Desktop Launcher
# This script starts the server and opens the app in a standalone window

APP_DIR="/home/suryansh/Projects/Open Frame"
cd "$APP_DIR"

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Server is already running..."
else
    echo "Starting Open Frame server..."
    # Start server in background
    npm run web > /tmp/openframe.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo "Waiting for server to start..."
    sleep 3
fi

# Try to open in app mode with various browsers
if command -v google-chrome &> /dev/null; then
    echo "Launching with Google Chrome..."
    google-chrome --app=http://localhost:3000 --window-size=1400,900 &
elif command -v chromium-browser &> /dev/null; then
    echo "Launching with Chromium..."
    chromium-browser --app=http://localhost:3000 --window-size=1400,900 &
elif command -v chromium &> /dev/null; then
    echo "Launching with Chromium..."
    chromium --app=http://localhost:3000 --window-size=1400,900 &
elif command -v firefox &> /dev/null; then
    echo "Launching with Firefox..."
    firefox --new-window http://localhost:3000 &
else
    echo "No suitable browser found. Please open http://localhost:3000 manually."
    xdg-open http://localhost:3000 2>/dev/null || echo "Please visit: http://localhost:3000"
fi

echo ""
echo "Open Frame is running!"
echo "Close the browser window to exit."
echo ""
