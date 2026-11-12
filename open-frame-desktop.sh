#!/bin/bash

# Open Frame Desktop Launcher (macOS & Linux)
# Starts the server if needed and opens the app in a standalone window

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

LOG_FILE="${TMPDIR:-/tmp}/openframe.log"
APP_URL="http://localhost:3000"

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Server is already running..."
else
    echo "Starting Open Frame server..."
    npm run web > "$LOG_FILE" 2>&1 &

    echo "Waiting for server to start..."
    for _ in $(seq 1 15); do
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
fi

# Launch in app mode depending on OS
if [ "$(uname)" = "Darwin" ]; then
    CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    BRAVE_APP="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    EDGE_APP="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

    if [ -x "$CHROME_APP" ]; then
        echo "Launching with Google Chrome..."
        "$CHROME_APP" --app="$APP_URL" --window-size=1400,900 >/dev/null 2>&1 &
    elif [ -x "$BRAVE_APP" ]; then
        echo "Launching with Brave..."
        "$BRAVE_APP" --app="$APP_URL" --window-size=1400,900 >/dev/null 2>&1 &
    elif [ -x "$EDGE_APP" ]; then
        echo "Launching with Microsoft Edge..."
        "$EDGE_APP" --app="$APP_URL" --window-size=1400,900 >/dev/null 2>&1 &
    else
        echo "Opening in default browser..."
        open "$APP_URL"
    fi
else
    if command -v google-chrome &> /dev/null; then
        echo "Launching with Google Chrome..."
        google-chrome --app="$APP_URL" --window-size=1400,900 &
    elif command -v chromium-browser &> /dev/null; then
        echo "Launching with Chromium..."
        chromium-browser --app="$APP_URL" --window-size=1400,900 &
    elif command -v chromium &> /dev/null; then
        echo "Launching with Chromium..."
        chromium --app="$APP_URL" --window-size=1400,900 &
    elif command -v firefox &> /dev/null; then
        echo "Launching with Firefox..."
        firefox --new-window "$APP_URL" &
    else
        echo "No suitable browser found. Opening default browser..."
        xdg-open "$APP_URL" 2>/dev/null || echo "Please visit: $APP_URL"
    fi
fi

echo ""
echo "Open Frame is running at $APP_URL"
echo "Server logs: $LOG_FILE"
echo ""
