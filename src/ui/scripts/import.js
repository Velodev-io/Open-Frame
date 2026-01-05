// Web version - uses fetch API and file input instead of Electron dialog

let isImporting = false;

// Import photos using file input
async function importPhotos() {
    if (isImporting) return;

    // Create file input
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

        // Reset progress
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

            // Upload files
            const response = await fetch('/api/photos/import', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update final progress
                updateProgress({
                    current: result.total,
                    total: result.total,
                    imported: result.imported,
                    skipped: result.skipped,
                    errors: result.errors,
                    currentFile: 'Complete!'
                });

                // Show final results
                setTimeout(async () => {
                    importModal.classList.remove('active');
                    isImporting = false;

                    // Reload photos
                    await loadPhotos();

                    // Show success message
                    if (result.imported > 0) {
                        alert(`Successfully imported ${result.imported} photo(s)!\\n${result.skipped} skipped, ${result.errors} errors.`);
                    } else {
                        alert('No new photos to import.');
                    }
                }, 1000);
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
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const importedCount = document.getElementById('importedCount');
    const skippedCount = document.getElementById('skippedCount');
    const errorCount = document.getElementById('errorCount');

    // Update progress bar
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    progressFill.style.width = percentage + '%';

    // Update text
    if (progress.total > 0) {
        progressText.textContent = `Processing ${progress.currentFile} (${progress.current}/${progress.total})`;
    } else {
        progressText.textContent = progress.currentFile;
    }

    // Update counts
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
