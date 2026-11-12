// Dual-mode gallery script (supports both Electron IPC and Web fetch API)

const isElectron = typeof window.electronAPI !== 'undefined';
let photos = [];
let currentPhotoId = null;

function toFileUrl(filePath) {
    if (!filePath) return '';
    const normalized = filePath.replace(/\\/g, '/');
    return encodeURI(normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`);
}

function getThumbnailSrc(photo) {
    if (isElectron && photo.thumbnail_path) {
        return toFileUrl(photo.thumbnail_path);
    }
    return `/thumbnails/${photo.id}`;
}

function getPhotoSrc(photo) {
    if (isElectron && photo.stored_path) {
        return toFileUrl(photo.stored_path);
    }
    return `/photos/${photo.id}`;
}

// Parse SQLite UTC timestamp or ISO date string reliably
function parseDate(input) {
    if (input instanceof Date) return input;
    if (typeof input === 'string') {
        // SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS" (UTC)
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
            return new Date(input.replace(' ', 'T') + 'Z');
        }
        return new Date(input);
    }
    return new Date();
}

// Load photos on page load
async function loadPhotos() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const photoGrid = document.getElementById('photoGrid');

    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    photoGrid.style.display = 'none';

    try {
        let result;
        if (isElectron) {
            result = await window.electronAPI.getAllPhotos();
        } else {
            const response = await fetch('/api/photos', {
                headers: { 'Accept': 'application/json' }
            });
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            result = await response.json();
        }

        if (result.success) {
            photos = result.photos || [];
            updateStats(photos);

            if (photos.length === 0) {
                loadingState.style.display = 'none';
                emptyState.style.display = 'flex';
            } else {
                renderPhotos(photos);
                loadingState.style.display = 'none';
                photoGrid.style.display = 'grid';
            }
        } else {
            console.error('Failed to load photos:', result.error);
            loadingState.style.display = 'none';
            emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading photos:', error);
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

// Render photos in grid
function renderPhotos(photosToRender) {
    const photoGrid = document.getElementById('photoGrid');
    photoGrid.innerHTML = '';

    photosToRender.forEach(photo => {
        const card = createPhotoCard(photo);
        photoGrid.appendChild(card);
    });
}

// Create photo card element
function createPhotoCard(photo) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.onclick = () => openPhotoModal(photo);

    const img = document.createElement('img');
    img.src = getThumbnailSrc(photo);
    img.alt = photo.filename;
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'photo-card-overlay';

    const title = document.createElement('div');
    title.className = 'photo-card-title';
    title.textContent = photo.filename;

    const date = document.createElement('div');
    date.className = 'photo-card-date';
    date.textContent = formatDate(photo.imported_at);

    overlay.appendChild(title);
    overlay.appendChild(date);
    card.appendChild(img);
    card.appendChild(overlay);

    return card;
}

// Update stats
function updateStats(photosList) {
    const totalPhotos = document.getElementById('totalPhotos');
    const storageUsed = document.getElementById('storageUsed');
    const lastImport = document.getElementById('lastImport');

    totalPhotos.textContent = photosList.length;

    // Calculate total storage
    const totalBytes = photosList.reduce((sum, photo) => sum + (photo.file_size || 0), 0);
    storageUsed.textContent = formatFileSize(totalBytes);

    // Get latest import date
    if (photosList.length > 0) {
        lastImport.textContent = formatDate(photosList[0].imported_at);
    } else {
        lastImport.textContent = 'Never';
    }
}

// Open photo modal
function openPhotoModal(photo) {
    currentPhotoId = photo.id;

    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    const modalFilename = document.getElementById('modalFilename');
    const modalDimensions = document.getElementById('modalDimensions');
    const modalSize = document.getElementById('modalSize');
    const modalDate = document.getElementById('modalDate');

    modalImage.src = getPhotoSrc(photo);
    modalFilename.textContent = photo.filename;
    modalDimensions.textContent = `${photo.width || 0} × ${photo.height || 0}`;
    modalSize.textContent = formatFileSize(photo.file_size || 0);
    modalDate.textContent = formatDate(photo.created_at || photo.imported_at);

    modal.classList.add('active');
}

// Close photo modal
function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    modal.classList.remove('active');
    currentPhotoId = null;
}

// Delete photo
async function deletePhoto() {
    if (!currentPhotoId) return;

    const confirmDelete = confirm('Are you sure you want to delete this photo?');
    if (!confirmDelete) return;

    try {
        let result;
        if (isElectron) {
            result = await window.electronAPI.deletePhoto(currentPhotoId);
        } else {
            const response = await fetch(`/api/photos/${currentPhotoId}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            result = await response.json();
        }

        if (result.success) {
            closePhotoModal();
            await loadPhotos();
        } else {
            alert('Failed to delete photo: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Failed to delete photo');
    }
}

// Search photos
function searchPhotos(query) {
    if (!query) {
        renderPhotos(photos);
        return;
    }

    const filtered = photos.filter(photo =>
        photo.filename.toLowerCase().includes(query.toLowerCase())
    );

    renderPhotos(filtered);
}

// Settings modal (Change Password & Logout)
function openSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (!settingsModal) return;
    document.getElementById('changePasswordForm').reset();
    document.getElementById('settingsMessage').textContent = '';
    document.getElementById('settingsMessage').className = 'settings-message';
    settingsModal.classList.add('active');
}

function closeSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.classList.remove('active');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const msgEl = document.getElementById('settingsMessage');

    msgEl.textContent = '';
    msgEl.className = 'settings-message';

    if (newPassword !== confirmPassword) {
        msgEl.textContent = 'New passwords do not match.';
        msgEl.classList.add('error');
        return;
    }

    if (newPassword.length < 6) {
        msgEl.textContent = 'New password must be at least 6 characters.';
        msgEl.classList.add('error');
        return;
    }

    try {
        let result;
        if (isElectron) {
            result = await window.electronAPI.changePassword(oldPassword, newPassword);
        } else {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            result = await response.json();
        }

        if (result.success) {
            document.getElementById('changePasswordForm').reset();
            msgEl.textContent = 'Password updated successfully!';
            msgEl.classList.add('success');
        } else {
            msgEl.textContent = result.error || 'Failed to update password.';
            msgEl.classList.add('error');
        }
    } catch (error) {
        msgEl.textContent = 'Failed to update password.';
        msgEl.classList.add('error');
    }
}

async function handleLogout() {
    try {
        if (isElectron) {
            await window.electronAPI.logout();
        } else {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Utility: Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Utility: Format date using local calendar days
function formatDate(dateInput) {
    const date = parseDate(dateInput);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Event listeners
document.getElementById('closeModal').addEventListener('click', closePhotoModal);
document.getElementById('deletePhotoBtn').addEventListener('click', deletePhoto);
document.querySelector('#photoModal .modal-backdrop').addEventListener('click', closePhotoModal);

const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
}

const closeSettingsBtn = document.getElementById('closeSettingsModal');
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
}

const settingsBackdrop = document.querySelector('#settingsModal .modal-backdrop');
if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', closeSettingsModal);
}

const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handleChangePassword);
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchPhotos(e.target.value);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePhotoModal();
        closeSettingsModal();
    }
});

// Load photos on page load
loadPhotos();
