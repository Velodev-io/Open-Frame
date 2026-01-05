#!/bin/bash

# Open Frame Installation Script
# This script installs Open Frame permanently on your Ubuntu system

echo "=========================================="
echo "  Open Frame - Permanent Installation"
echo "=========================================="
echo ""

APP_DIR="/home/suryansh/Projects/Open Frame"
cd "$APP_DIR"

# 1. Copy systemd service file
echo "Installing systemd service..."
sudo cp open-frame.service /etc/systemd/system/
sudo systemctl daemon-reload

# 2. Enable service to start on boot
echo "Enabling auto-start on boot..."
sudo systemctl enable open-frame.service

# 3. Start the service now
echo "Starting Open Frame server..."
sudo systemctl start open-frame.service

# 4. Ensure desktop entry is properly installed
echo "Installing desktop launcher..."
chmod +x open-frame-desktop.sh
chmod +x open-frame.desktop
mkdir -p ~/.local/share/applications
cp open-frame.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

# 5. Check service status
sleep 2
if systemctl is-active --quiet open-frame.service; then
    echo ""
    echo "✅ Installation successful!"
    echo ""
    echo "Open Frame is now:"
    echo "  • Running in the background"
    echo "  • Will auto-start on system boot"
    echo "  • Available in your applications menu"
    echo ""
    echo "To launch: Press Super key and type 'Open Frame'"
    echo "Or visit: http://localhost:3000 in your browser"
    echo ""
    echo "Useful commands:"
    echo "  • Check status:  systemctl status open-frame"
    echo "  • Stop server:   sudo systemctl stop open-frame"
    echo "  • Restart:       sudo systemctl restart open-frame"
    echo "  • View logs:     journalctl -u open-frame -f"
    echo ""
else
    echo ""
    echo "⚠️  Service installation completed but server may not be running."
    echo "Check status with: systemctl status open-frame"
    echo ""
fi

echo "=========================================="
