#!/bin/bash

# Open Frame Uninstallation Script

echo "=========================================="
echo "  Open Frame - Uninstallation"
echo "=========================================="
echo ""

echo "Stopping Open Frame service..."
sudo systemctl stop open-frame.service 2>/dev/null || true

echo "Disabling auto-start..."
sudo systemctl disable open-frame.service 2>/dev/null || true

echo "Removing systemd service..."
sudo rm -f /etc/systemd/system/open-frame.service
sudo systemctl daemon-reload

echo "Removing desktop launcher..."
rm -f ~/.local/share/applications/open-frame.desktop
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

echo ""
echo "✅ Open Frame uninstalled successfully!"
echo ""
echo "Note: Your photo data is still preserved at:"
echo "  ~/.openframe-web/"
echo ""
echo "To completely remove all data:"
echo "  rm -rf ~/.openframe-web/"
echo ""
echo "=========================================="
