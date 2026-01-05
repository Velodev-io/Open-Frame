const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Auth APIs
    isFirstLaunch: () => ipcRenderer.invoke('auth:is-first-launch'),
    setupPassword: (password) => ipcRenderer.invoke('auth:setup-password', password),
    verifyPassword: (password) => ipcRenderer.invoke('auth:verify-password', password),
    loginSuccess: () => ipcRenderer.send('auth:login-success'),
    changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:change-password', oldPassword, newPassword),

    // Photo APIs
    getAllPhotos: () => ipcRenderer.invoke('photos:get-all'),
    importPhotos: () => ipcRenderer.invoke('photos:import'),
    deletePhoto: (photoId) => ipcRenderer.invoke('photos:delete', photoId),

    // Event listeners
    onImportProgress: (callback) => {
        ipcRenderer.on('photos:import-progress', (event, progress) => callback(progress));
    }
});
