const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
const THUMBNAIL_SIZE = 300;

class PhotoManager {
    constructor(database, photosDir) {
        this.db = database;
        this.photosDir = photosDir;
        this.thumbnailsDir = path.join(photosDir, 'thumbnails');

        // Ensure thumbnails directory exists
        if (!fsSync.existsSync(this.thumbnailsDir)) {
            fsSync.mkdirSync(this.thumbnailsDir, { recursive: true });
        }
    }

    async importFromFolder(folderPath, progressCallback) {
        const files = await this.getAllImageFiles(folderPath);
        const totalFiles = files.length;
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < files.length; i++) {
            const filePath = files[i];

            try {
                // Check if already imported
                if (this.db.photoExists(filePath)) {
                    skipped++;
                    if (progressCallback) {
                        progressCallback({
                            current: i + 1,
                            total: totalFiles,
                            imported,
                            skipped,
                            errors,
                            currentFile: path.basename(filePath)
                        });
                    }
                    continue;
                }

                // Import the photo
                await this.importPhoto(filePath);
                imported++;
            } catch (error) {
                console.error(`Error importing ${filePath}:`, error);
                errors++;
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: totalFiles,
                    imported,
                    skipped,
                    errors,
                    currentFile: path.basename(filePath)
                });
            }
        }

        return { imported, skipped, errors, total: totalFiles };
    }

    async getAllImageFiles(dirPath) {
        const files = [];

        async function traverse(currentPath) {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await traverse(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (SUPPORTED_FORMATS.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }

        await traverse(dirPath);
        return files;
    }

    async importPhoto(filePath) {
        const filename = path.basename(filePath);
        const ext = path.extname(filename);
        const timestamp = Date.now();
        const storedFilename = `${timestamp}_${filename}`;
        const storedPath = path.join(this.photosDir, storedFilename);
        const thumbnailFilename = `thumb_${timestamp}_${filename.replace(ext, '.jpg')}`;
        const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);

        // Copy original file
        await fs.copyFile(filePath, storedPath);

        // Get image metadata and create thumbnail
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Create thumbnail
        await image
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

        // Get file stats
        const stats = await fs.stat(filePath);

        // Get creation time (try to use EXIF data if available, otherwise use file stats)
        let createdAt = stats.birthtime || stats.mtime;

        // Store in database
        const photoData = {
            originalPath: filePath,
            storedPath: storedPath,
            thumbnailPath: thumbnailPath,
            filename: filename,
            fileSize: stats.size,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            createdAt: createdAt.toISOString()
        };

        return this.db.addPhoto(photoData);
    }

    getAllPhotos() {
        return this.db.getAllPhotos();
    }

    async deletePhoto(photoId) {
        const photo = this.db.getPhotoById(photoId);
        if (!photo) {
            throw new Error('Photo not found');
        }

        // Delete files
        try {
            if (fsSync.existsSync(photo.stored_path)) {
                await fs.unlink(photo.stored_path);
            }
            if (photo.thumbnail_path && fsSync.existsSync(photo.thumbnail_path)) {
                await fs.unlink(photo.thumbnail_path);
            }
        } catch (error) {
            console.error('Error deleting photo files:', error);
        }

        // Delete from database
        this.db.deletePhoto(photoId);
    }
}

module.exports = PhotoManager;
