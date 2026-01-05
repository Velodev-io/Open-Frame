const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./src/db/database');
const Auth = require('./src/auth/auth');
const PhotoManager = require('./src/photos/photoManager');

let mainWindow;
let db;
let auth;
let photoManager;

// App data directory for storing photos and database
const APP_DATA_DIR = path.join(app.getPath('userData'), 'OpenFrame');
const PHOTOS_DIR = path.join(APP_DATA_DIR, 'photos');
const DB_PATH = path.join(APP_DATA_DIR, 'openframe.db');

// Ensure directories exist
if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#0a0a0a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        frame: true,
        titleBarStyle: 'default'
    });

    // Initialize modules
    db = new Database(DB_PATH);
    auth = new Auth(db);
    photoManager = new PhotoManager(db, PHOTOS_DIR);

    // Check if password is set
    const isFirstLaunch = !auth.hasPassword();

    if (isFirstLaunch) {
        mainWindow.loadFile('src/ui/login.html');
    } else {
        mainWindow.loadFile('src/ui/login.html');
    }

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Check if this is first launch
ipcMain.handle('auth:is-first-launch', async () => {
    return !auth.hasPassword();
});

// Setup password (first time)
ipcMain.handle('auth:setup-password', async (event, password) => {
    try {
        await auth.setupPassword(password);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Verify password
ipcMain.handle('auth:verify-password', async (event, password) => {
    try {
        const isValid = await auth.verifyPassword(password);
        return { success: isValid };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Load main app after successful login
ipcMain.on('auth:login-success', () => {
    mainWindow.loadFile('src/ui/index.html');
});

// Get all photos
ipcMain.handle('photos:get-all', async () => {
    try {
        const photos = photoManager.getAllPhotos();
        return { success: true, photos };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Import photos from folder
ipcMain.handle('photos:import', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select folder to import photos from'
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const folderPath = result.filePaths[0];
        const importResult = await photoManager.importFromFolder(folderPath, (progress) => {
            // Send progress updates to renderer
            mainWindow.webContents.send('photos:import-progress', progress);
        });

        return { success: true, ...importResult };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Delete photo
ipcMain.handle('photos:delete', async (event, photoId) => {
    try {
        await photoManager.deletePhoto(photoId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Change password
ipcMain.handle('auth:change-password', async (event, oldPassword, newPassword) => {
    try {
        const result = await auth.changePassword(oldPassword, newPassword);
        return { success: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
