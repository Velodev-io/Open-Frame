// Web version - uses fetch API instead of Electron IPC

let photos = [];
let currentPhotoId = null;

// Load photos on page load
async function loadPhotos() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const photoGrid = document.getElementById('photoGrid');

    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    photoGrid.style.display = 'none';

    try {
        const response = await fetch('/api/photos');
        const result = await response.json();

        if (result.success) {
            photos = result.photos;

            if (photos.length === 0) {
                // Show empty state
                loadingState.style.display = 'none';
                emptyState.style.display = 'flex';
            } else {
                // Render photos
                renderPhotos(photos);
                updateStats(photos);
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
    img.src = `/thumbnails/${photo.id}`;
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
function updateStats(photos) {
    const totalPhotos = document.getElementById('totalPhotos');
    const storageUsed = document.getElementById('storageUsed');
    const lastImport = document.getElementById('lastImport');

    totalPhotos.textContent = photos.length;

    // Calculate total storage
    const totalBytes = photos.reduce((sum, photo) => sum + (photo.file_size || 0), 0);
    storageUsed.textContent = formatFileSize(totalBytes);

    // Get latest import date
    if (photos.length > 0) {
        const latestDate = new Date(photos[0].imported_at);
        lastImport.textContent = formatDate(latestDate);
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

    modalImage.src = `/photos/${photo.id}`;
    modalFilename.textContent = photo.filename;
    modalDimensions.textContent = `${photo.width} × ${photo.height}`;
    modalSize.textContent = formatFileSize(photo.file_size);
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
        const response = await fetch(`/api/photos/${currentPhotoId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            closePhotoModal();
            // Reload photos
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

// Utility: Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
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

// Close modal on backdrop click
document.querySelector('#photoModal .modal-backdrop').addEventListener('click', closePhotoModal);

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchPhotos(e.target.value);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePhotoModal();
    }
});

// Load photos on page load
loadPhotos();
