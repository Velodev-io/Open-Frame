// Dual-mode import script (supports both Electron IPC and Web fetch API)

let isImporting = false;

if (typeof window.electronAPI !== 'undefined' && window.electronAPI.onImportProgress) {
    window.electronAPI.onImportProgress((progress) => {
        updateProgress(progress);
    });
}

async function importPhotos() {
    if (isImporting) return;

    if (typeof window.electronAPI !== 'undefined') {
        await importPhotosElectron();
    } else {
        importPhotosWeb();
    }
}

async function importPhotosElectron() {
    isImporting = true;
    const importModal = document.getElementById('importModal');

    try {
        updateProgress({
            current: 0,
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 0,
            currentFile: 'Selecting folder...'
        });

        const result = await window.electronAPI.importPhotos();

        if (result.canceled) {
            importModal.classList.remove('active');
            isImporting = false;
            return;
        }

        importModal.classList.add('active');

        if (result.success) {
            updateProgress({
                current: result.total,
                total: result.total,
                imported: result.imported,
                skipped: result.skipped,
                errors: result.errors,
                currentFile: 'Complete!'
            });

            setTimeout(async () => {
                importModal.classList.remove('active');
                isImporting = false;
                await loadPhotos();

                if (result.imported > 0) {
                    alert(`Successfully imported ${result.imported} photo(s)!\n${result.skipped} skipped, ${result.errors} errors.`);
                } else {
                    alert(`No new photos imported (${result.skipped} skipped, ${result.errors} errors).`);
                }
            }, 800);
        } else {
            importModal.classList.remove('active');
            isImporting = false;
            alert('Failed to import photos: ' + result.error);
        }
    } catch (error) {
        console.error('Import error:', error);
        importModal.classList.remove('active');
        isImporting = false;
        alert('Failed to import photos');
    }
}

function importPhotosWeb() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff';

    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        isImporting = true;
        const importModal = document.getElementById('importModal');
        importModal.classList.add('active');

        updateProgress({
            current: 0,
            total: files.length,
            imported: 0,
            skipped: 0,
            errors: 0,
            currentFile: 'Starting...'
        });

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('photos', file);
            });

            const response = await fetch('/api/photos/import', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();

            if (result.success) {
                updateProgress({
                    current: result.total,
                    total: result.total,
                    imported: result.imported,
                    skipped: result.skipped,
                    errors: result.errors,
                    currentFile: 'Complete!'
                });

                setTimeout(async () => {
                    importModal.classList.remove('active');
                    isImporting = false;

                    await loadPhotos();

                    if (result.imported > 0) {
                        alert(`Successfully imported ${result.imported} photo(s)!\n${result.skipped} skipped, ${result.errors} errors.`);
                    } else {
                        alert(`No new photos to import (${result.skipped} skipped, ${result.errors} errors).`);
                    }
                }, 800);
            } else {
                importModal.classList.remove('active');
                isImporting = false;
                alert('Failed to import photos: ' + result.error);
            }
        } catch (error) {
            console.error('Import error:', error);
            importModal.classList.remove('active');
            isImporting = false;
            alert('Failed to import photos');
        }
    };

    fileInput.click();
}

// Update progress display
function updateProgress(progress) {
    const importModal = document.getElementById('importModal');
    if (progress.total > 0 && !importModal.classList.contains('active')) {
        importModal.classList.add('active');
    }

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const importedCount = document.getElementById('importedCount');
    const skippedCount = document.getElementById('skippedCount');
    const errorCount = document.getElementById('errorCount');

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    progressFill.style.width = percentage + '%';

    if (progress.total > 0) {
        progressText.textContent = `Processing ${progress.currentFile} (${progress.current}/${progress.total})`;
    } else {
        progressText.textContent = progress.currentFile;
    }

    importedCount.textContent = progress.imported;
    skippedCount.textContent = progress.skipped;
    errorCount.textContent = progress.errors;
}

// Event listeners
document.getElementById('importBtn').addEventListener('click', importPhotos);
document.getElementById('emptyImportBtn').addEventListener('click', importPhotos);

// Close import modal on backdrop click (only after import completes)
document.querySelector('#importModal .modal-backdrop').addEventListener('click', () => {
    if (!isImporting) {
        document.getElementById('importModal').classList.remove('active');
    }
});
