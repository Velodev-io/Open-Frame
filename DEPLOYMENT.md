# Open Frame - Deployment Guide

## ✅ Permanent Installation Complete!

Open Frame is now permanently installed on your Ubuntu system!

## 🚀 How to Use

### Launch the App

**Option 1: Applications Menu (Easiest)**
1. Press the **Super key** (Windows key)
2. Type **"Open Frame"**
3. Click the app icon

**Option 2: Quick Launcher**
```bash
cd "/path/to/Open Frame"
./open-frame-desktop.sh
```

The app will open in its own standalone window!

## 🔧 System Configuration

### Auto-Start Status
- ✅ Server runs automatically on system boot
- ✅ Always available at `http://localhost:3000`
- ✅ Integrated with Ubuntu applications menu

### Service Management

**Check if running:**
```bash
systemctl status open-frame
```

**Stop the server:**
```bash
sudo systemctl stop open-frame
```

**Start the server:**
```bash
sudo systemctl start open-frame
```

**Restart the server:**
```bash
sudo systemctl restart open-frame
```

**Disable auto-start on boot:**
```bash
sudo systemctl disable open-frame
```

**Enable auto-start on boot:**
```bash
sudo systemctl enable open-frame
```

**View server logs:**
```bash
journalctl -u open-frame -f
```

## 🗑️ Uninstallation

To remove Open Frame from your system:

```bash
cd "/path/to/Open Frame"
./uninstall.sh
```

This will:
- Stop the server
- Remove auto-start
- Remove desktop launcher

Your photo data will be preserved at `~/.openframe-web/`

To completely remove all data:
```bash
rm -rf ~/.openframe-web/
```

## 📁 Data Location

All your photos and app data are stored at:
```
~/.openframe-web/
├── photos/           # Your imported photos
│   └── thumbnails/   # Generated thumbnails
└── openframe.db      # Database
```

## ⚡ Quick Reference

| Action | Command |
|--------|---------|
| Launch App | Press Super key → "Open Frame" |
| Check Status | `systemctl status open-frame` |
| Restart Server | `sudo systemctl restart open-frame` |
| View Logs | `journalctl -u open-frame -f` |
| Uninstall | `./uninstall.sh` |

## 🎉 Features

- Password-protected authentication
- Modern dark theme UI
- Import photos from your computer
- Photo gallery with search
- Full-size photo viewer
- Statistics dashboard
- Runs as standalone desktop app
- Auto-starts on system boot

---

**Open Frame is ready to use!** Just press the Super key and type "Open Frame" to launch.
