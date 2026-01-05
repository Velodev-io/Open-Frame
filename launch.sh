#!/bin/bash

# Open Frame - Launch Script with Debugging
# This script tries multiple methods to launch the Electron app

echo "=========================================="
echo "Open Frame - Launch Script"
echo "=========================================="
echo ""

# Method 1: Try with original configuration
echo "Method 1: Standard X11 launch..."
GDK_BACKEND=x11 ./node_modules/.bin/electron . --no-sandbox --disable-gpu --ozone-platform=x11 2>&1 | tee /tmp/openframe-debug.log
if [ $? -eq 0 ]; then
    echo "Success!"
    exit 0
fi

echo "Method 1 failed. Trying Method 2..."
echo ""

# Method 2: Try without GPU acceleration at all
echo "Method 2: Disabling all acceleration..."
GDK_BACKEND=x11 ./node_modules/.bin/electron . --no-sandbox --disable-gpu --disable-software-rasterizer --disable-dev-shm-usage 2>&1 | tee -a /tmp/openframe-debug.log
if [ $? -eq 0 ]; then
    echo "Success!"
    exit 0
fi

echo "Method 2 failed. Trying Method 3..."
echo ""

# Method 3: Try enabling Wayland explicitly
echo "Method 3: Native Wayland..."
ELECTRON_OZONE_PLATFORM_HINT=auto ./node_modules/.bin/electron . --ozone-platform-hint=auto --enable-features=UseOzonePlatform 2>&1 | tee -a /tmp/openframe-debug.log
if [ $? -eq 0 ]; then
    echo "Success!"
    exit 0
fi

echo ""
echo "=========================================="
echo "All methods failed!"
echo "Debug log saved to: /tmp/openframe-debug.log"
echo ""
echo "Please try one of these manual alternatives:"
echo ""
echo "1. Install system dependencies:"
echo "   sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1"
echo ""
echo "2. Switch to X11 session:"
echo "   Log out, click gear icon at login, select 'Ubuntu on Xorg'"
echo ""
echo "3. Check debug log for specific errors:"
echo "   cat /tmp/openframe-debug.log"
echo "=========================================="
exit 1
