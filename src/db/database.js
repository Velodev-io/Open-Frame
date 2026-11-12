const Database = require('better-sqlite3');

class DatabaseManager {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.initializeTables();
    }

    initializeTables() {
        // User credentials table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Photos metadata table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_path TEXT NOT NULL,
        stored_path TEXT NOT NULL,
        thumbnail_path TEXT,
        filename TEXT NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        format TEXT,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME
      )
    `);

        // Create indexes for better performance
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photos_imported 
      ON photos(imported_at DESC)
    `);
    }

    // Credential operations
    getCredential() {
        const stmt = this.db.prepare('SELECT * FROM credentials LIMIT 1');
        return stmt.get();
    }

    setCredential(passwordHash) {
        const existing = this.getCredential();
        if (existing) {
            const stmt = this.db.prepare(`
        UPDATE credentials 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
            stmt.run(passwordHash, existing.id);
        } else {
            const stmt = this.db.prepare('INSERT INTO credentials (password_hash) VALUES (?)');
            stmt.run(passwordHash);
        }
    }

    // Photo operations
    addPhoto(photoData) {
        const stmt = this.db.prepare(`
      INSERT INTO photos (
        original_path, stored_path, thumbnail_path, filename,
        file_size, width, height, format, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const info = stmt.run(
            photoData.originalPath,
            photoData.storedPath,
            photoData.thumbnailPath,
            photoData.filename,
            photoData.fileSize,
            photoData.width,
            photoData.height,
            photoData.format,
            photoData.createdAt
        );

        return info.lastInsertRowid;
    }

    getAllPhotos() {
        const stmt = this.db.prepare('SELECT * FROM photos ORDER BY imported_at DESC');
        return stmt.all();
    }

    getPhotoById(id) {
        const stmt = this.db.prepare('SELECT * FROM photos WHERE id = ?');
        return stmt.get(id);
    }

    deletePhoto(id) {
        const stmt = this.db.prepare('DELETE FROM photos WHERE id = ?');
        return stmt.run(id);
    }

    photoExists(originalPath, filename = null, fileSize = null) {
        const byPathStmt = this.db.prepare('SELECT id FROM photos WHERE original_path = ?');
        if (byPathStmt.get(originalPath) !== undefined) {
            return true;
        }
        if (filename !== null && fileSize !== null) {
            const byMetaStmt = this.db.prepare('SELECT id FROM photos WHERE filename = ? AND file_size = ?');
            return byMetaStmt.get(filename, fileSize) !== undefined;
        }
        return false;
    }

    close() {
        if (this.db && this.db.open) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
