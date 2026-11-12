# Open Frame

Modern, password-protected local photo management application for **macOS**, **Windows**, and **Linux**.

![Open Frame Logo](assets/logo.png)

## Features

- 🔒 **Password Protection** - Secure your photo gallery with bcrypt password authentication
- 📁 **Local Storage** - All photos and metadata are stored locally on your machine
- 🎨 **Modern UI** - Dark theme with glassmorphism effects and responsive grid
- 📸 **Smart Import** - Import individual photos (Web) or entire folders (Desktop)
- 🔍 **Search** - Quickly find photos by filename
- 🖼️ **Photo Viewer** - Full-size photo viewer with dimensions, size, and date metadata
- ⚡ **Fast Performance** - EXIF-aware thumbnail generation using Sharp
- 🖥️ **Cross-Platform** - Run as an Electron desktop app or standalone local web app

## Prerequisites

- **Node.js** (v18, v20, or v22 LTS recommended for prebuilt native modules `better-sqlite3`, `bcrypt`, and `sharp`)
- **npm** (included with Node.js)

> **Note for macOS / Windows native builds:** If you use a newer Node.js version without prebuilt binaries, you may need Xcode Command Line Tools (`xcode-select --install`) on macOS or Visual Studio Build Tools on Windows.

---

## Installation & Running

Clone the repository and install dependencies:

```bash
git clone https://github.com/Velodev-io/Open-Frame.git
cd Open-Frame
npm install
```

### macOS

- **Electron Desktop App:**
  ```bash
  npm start
  ```
- **Web App Mode (Browser):**
  ```bash
  npm run web
  ```
  Then open `http://localhost:3000` in your browser, or use the standalone window launcher:
  ```bash
  chmod +x open-frame-desktop.sh
  ./open-frame-desktop.sh
  ```

### Windows

- **Electron Desktop App:**
  ```cmd
  npm start
  ```
- **Web App Mode (Browser):**
  ```cmd
  npm run web
  ```
  Then open `http://localhost:3000` in your browser, or double-click / run:
  ```cmd
  open-frame-desktop.bat
  ```

### Linux (Ubuntu)

- **Electron Desktop App:**
  ```bash
  npm start
  ```
- **Web App Mode (Browser):**
  ```bash
  chmod +x open-frame-desktop.sh
  ./open-frame-desktop.sh
  ```
- **Optional Permanent Ubuntu Installation (systemd + Applications Menu):**
  ```bash
  chmod +x install.sh
  ./install.sh
  ```

---

## Usage

1. **First Launch**: Create a password (minimum 6 characters) to protect your gallery.
2. **Import Photos**: Click **Import** to select photos (Web mode) or a folder (Electron mode).
3. **Browse & Search**: View thumbnails in the grid and filter by filename using the search bar.
4. **View Details**: Click any photo to inspect full resolution and metadata or delete it.
5. **Settings**: Click the gear icon in the header to change your password or lock/logout.

## Supported Image Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- BMP (`.bmp`)
- TIFF (`.tiff`)

## Data Storage

- **Web Mode** (`npm run web` / desktop launchers):
  - **macOS / Linux:** `~/.openframe-web/`
  - **Windows:** `%USERPROFILE%\.openframe-web\`
  ```
  .openframe-web/
  ├── photos/           # Imported photos
  │   └── thumbnails/   # Generated thumbnails
  ├── openframe.db      # SQLite database
  └── .session_secret   # Auto-generated session secret
  ```
- **Electron Mode** (`npm start`):
  - **macOS:** `~/Library/Application Support/open-frame/OpenFrame/`
  - **Windows:** `%APPDATA%\open-frame\OpenFrame\`
  - **Linux:** `~/.config/open-frame/OpenFrame/`

## Stopping the Web Server

- **macOS / Linux:**
  ```bash
  pkill -f "node server.js"
  ```
- **Windows:**
  Close the minimized `Open Frame Server` command window or run:
  ```cmd
  taskkill /F /IM node.exe
  ```

## Technical Details

- **Desktop Shell**: Electron (`main.js` / `preload.js`)
- **Web Backend**: Node.js with Express.js (`server.js`), bound to `127.0.0.1:3000` by default
- **Database**: SQLite (`better-sqlite3`)
- **Image Processing**: Sharp
- **Security**: `bcrypt` password hashing, rate-limited login, and `express-session`

## License

MIT
