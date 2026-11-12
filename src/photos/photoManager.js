const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
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
            const filename = path.basename(filePath);

            try {
                const stats = await fs.stat(filePath);

                // Check if already imported
                if (this.db.photoExists(filePath, filename, stats.size)) {
                    skipped++;
                    if (progressCallback) {
                        progressCallback({
                            current: i + 1,
                            total: totalFiles,
                            imported,
                            skipped,
                            errors,
                            currentFile: filename
                        });
                    }
                    continue;
                }

                // Import the photo
                await this.importPhoto(filePath, filename);
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
                    currentFile: filename
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

    async importPhoto(filePath, originalFilename = null) {
        const rawName = originalFilename || path.basename(filePath);
        const filename = path.basename(rawName);
        const parsed = path.parse(filename);
        const ext = (parsed.ext || path.extname(filePath)).toLowerCase();

        if (ext && !SUPPORTED_FORMATS.includes(ext)) {
            throw new Error(`Unsupported image format: ${ext}`);
        }

        const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const safeBaseName = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo';
        const finalExt = ext || '.jpg';
        const storedFilename = `${uniquePrefix}_${safeBaseName}${finalExt}`;
        const storedPath = path.join(this.photosDir, storedFilename);
        const thumbnailFilename = `thumb_${uniquePrefix}_${safeBaseName}.jpg`;
        const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);

        // Copy original file
        await fs.copyFile(filePath, storedPath);

        try {
            // Get image metadata and create thumbnail with EXIF orientation applied
            const image = sharp(filePath);
            const metadata = await image.metadata();

            // Account for EXIF orientation 5-8 where width/height swap
            const isRotated = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
            const width = isRotated ? metadata.height : metadata.width;
            const height = isRotated ? metadata.width : metadata.height;

            await sharp(filePath)
                .rotate()
                .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            // Get file stats
            const stats = await fs.stat(filePath);
            const createdAt = stats.birthtime || stats.mtime;

            // Store in database
            const photoData = {
                originalPath: originalFilename ? filename : filePath,
                storedPath: storedPath,
                thumbnailPath: thumbnailPath,
                filename: filename,
                fileSize: stats.size,
                width: width,
                height: height,
                format: metadata.format,
                createdAt: createdAt.toISOString()
            };

            return this.db.addPhoto(photoData);
        } catch (error) {
            // Clean up partially copied files if processing fails
            if (fsSync.existsSync(storedPath)) {
                await fs.unlink(storedPath).catch(() => {});
            }
            if (fsSync.existsSync(thumbnailPath)) {
                await fs.unlink(thumbnailPath).catch(() => {});
            }
            throw error;
        }
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
