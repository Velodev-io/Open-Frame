const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fSync = require('fs');
const crypto = require('crypto');
const Database = require('./src/db/database');
const Auth = require('./src/auth/auth');
const PhotoManager = require('./src/photos/photoManager');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// App data directory
const APP_DATA_DIR = path.join(require('os').homedir(), '.openframe-web');
const PHOTOS_DIR = path.join(APP_DATA_DIR, 'photos');
const TEMP_DIR = path.join(APP_DATA_DIR, 'temp');
const DB_PATH = path.join(APP_DATA_DIR, 'openframe.db');
const SECRET_PATH = path.join(APP_DATA_DIR, '.session_secret');

// Ensure directories exist
function ensureDirectories() {
    [APP_DATA_DIR, PHOTOS_DIR, TEMP_DIR].forEach((dir) => {
        if (!fSync.existsSync(dir)) {
            fSync.mkdirSync(dir, { recursive: true });
        }
    });
}

// Get or generate persistent random session secret
function getSessionSecret() {
    if (process.env.SESSION_SECRET) {
        return process.env.SESSION_SECRET;
    }
    try {
        if (fSync.existsSync(SECRET_PATH)) {
            return fSync.readFileSync(SECRET_PATH, 'utf8').trim();
        }
        const secret = crypto.randomBytes(32).toString('hex');
        fSync.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
        return secret;
    } catch (error) {
        return crypto.randomBytes(32).toString('hex');
    }
}

ensureDirectories();

// Initialize modules
const db = new Database(DB_PATH);
const auth = new Auth(db);
const photoManager = new PhotoManager(db, PHOTOS_DIR);

// Rate limiting for login attempts
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record) return { allowed: true };
    if (now - record.firstAttempt > LOCKOUT_MS) {
        loginAttempts.delete(ip);
        return { allowed: true };
    }
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
        const retryAfter = Math.ceil((LOCKOUT_MS - (now - record.firstAttempt)) / 1000);
        return { allowed: false, retryAfter };
    }
    return { allowed: true };
}

function recordFailedAttempt(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || now - record.firstAttempt > LOCKOUT_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
        record.count += 1;
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null, // Session expires when browser closes
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/styles', express.static(path.join(__dirname, 'src/ui/styles')));
app.use('/scripts', express.static(path.join(__dirname, 'src/ui/scripts')));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'src/ui/index-web.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/ui/login-web.html'));
});

// API Routes
app.get('/api/auth/is-first-launch', (req, res) => {
    res.json({ isFirstLaunch: !auth.hasPassword() });
});

app.post('/api/auth/setup-password', async (req, res) => {
    try {
        await auth.setupPassword(req.body.password);
        req.session.authenticated = true;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/verify-password', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress || 'local';
    const rateStatus = checkRateLimit(ip);
    if (!rateStatus.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many failed attempts. Try again in ${rateStatus.retryAfter}s.`
        });
    }

    try {
        const isValid = await auth.verifyPassword(req.body.password);
        if (isValid) {
            loginAttempts.delete(ip);
            req.session.authenticated = true;
            res.json({ success: true });
        } else {
            recordFailedAttempt(ip);
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        await auth.changePassword(oldPassword, newPassword);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/photos', requireAuth, (req, res) => {
    try {
        const photos = photoManager.getAllPhotos();
        res.json({ success: true, photos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve photo files
app.get('/photos/:photoId', requireAuth, (req, res) => {
    try {
        const photo = db.getPhotoById(parseInt(req.params.photoId, 10));
        if (!photo || !photo.stored_path || !fSync.existsSync(photo.stored_path)) {
            return res.status(404).send('Photo not found');
        }
        res.sendFile(photo.stored_path, (err) => {
            if (err && !res.headersSent) {
                res.status(404).send('Photo file not found');
            }
        });
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).send('Error loading photo');
        }
    }
});

// Serve thumbnails
app.get('/thumbnails/:photoId', requireAuth, (req, res) => {
    try {
        const photo = db.getPhotoById(parseInt(req.params.photoId, 10));
        if (!photo || !photo.thumbnail_path || !fSync.existsSync(photo.thumbnail_path)) {
            return res.status(404).send('Thumbnail not found');
        }
        res.sendFile(photo.thumbnail_path, (err) => {
            if (err && !res.headersSent) {
                res.status(404).send('Thumbnail file not found');
            }
        });
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).send('Error loading thumbnail');
        }
    }
});

// File upload for import
const upload = multer({ dest: TEMP_DIR });

app.post('/api/photos/import', requireAuth, upload.array('photos', 100), async (req, res) => {
    try {
        const files = req.files || [];
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const filename = path.basename(file.originalname || file.filename);
                if (db.photoExists(filename, filename, file.size)) {
                    skipped++;
                } else {
                    await photoManager.importPhoto(file.path, filename);
                    imported++;
                }
            } catch (error) {
                console.error('Error importing file:', error);
                errors++;
            } finally {
                // Always clean up temp file
                await fs.unlink(file.path).catch(() => {});
            }
        }

        res.json({ success: true, imported, skipped, errors, total: files.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/photos/:photoId', requireAuth, async (req, res) => {
    try {
        await photoManager.deletePhoto(parseInt(req.params.photoId, 10));
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Start server bound to localhost by default
const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('==========================================');
    console.log('   Open Frame - Web Version Started!');
    console.log('==========================================');
    console.log('');
    console.log('   Open your browser and visit:');
    console.log(`   http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`);
    console.log('');
    console.log('   Press Ctrl+C to stop the server');
    console.log('==========================================');
    console.log('');
});

// Graceful shutdown
function shutdown() {
    server.close(() => {
        db.close();
        process.exit(0);
    });
    setTimeout(() => {
        db.close();
        process.exit(0);
    }, 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
