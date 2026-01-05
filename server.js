const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Database = require('./src/db/database');
const Auth = require('./src/auth/auth');
const PhotoManager = require('./src/photos/photoManager');

const app = express();
const PORT = 3000;

// App data directory
const APP_DATA_DIR = path.join(require('os').homedir(), '.openframe-web');
const PHOTOS_DIR = path.join(APP_DATA_DIR, 'photos');
const DB_PATH = path.join(APP_DATA_DIR, 'openframe.db');

// Ensure directories exist
async function ensureDirectories() {
    const fSync = require('fs');
    if (!fSync.existsSync(APP_DATA_DIR)) {
        fSync.mkdirSync(APP_DATA_DIR, { recursive: true });
    }
    if (!fSync.existsSync(PHOTOS_DIR)) {
        fSync.mkdirSync(PHOTOS_DIR, { recursive: true });
    }
}

ensureDirectories();

// Initialize modules
const db = new Database(DB_PATH);
const auth = new Auth(db);
const photoManager = new PhotoManager(db, PHOTOS_DIR);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'openframe-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null, // Session expires when browser closes
        secure: false,
        httpOnly: true
    }
}));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/styles', express.static(path.join(__dirname, 'src/ui/styles')));
app.use('/scripts', express.static(path.join(__dirname, 'src/ui/scripts')));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.authenticated) {
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
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/auth/verify-password', async (req, res) => {
    try {
        const isValid = await auth.verifyPassword(req.body.password);
        if (isValid) {
            req.session.authenticated = true;
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Invalid password' });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/photos', requireAuth, (req, res) => {
    try {
        const photos = photoManager.getAllPhotos();
        res.json({ success: true, photos });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Serve photo files
app.get('/photos/:photoId', requireAuth, (req, res) => {
    try {
        const photo = db.getPhotoById(parseInt(req.params.photoId));
        if (!photo) {
            return res.status(404).send('Photo not found');
        }
        res.sendFile(photo.stored_path);
    } catch (error) {
        res.status(500).send('Error loading photo');
    }
});

// Serve thumbnails
app.get('/thumbnails/:photoId', requireAuth, (req, res) => {
    try {
        const photo = db.getPhotoById(parseInt(req.params.photoId));
        if (!photo || !photo.thumbnail_path) {
            return res.status(404).send('Thumbnail not found');
        }
        res.sendFile(photo.thumbnail_path);
    } catch (error) {
        res.status(500).send('Error loading thumbnail');
    }
});

// File upload for import
const upload = multer({ dest: path.join(APP_DATA_DIR, 'temp') });

app.post('/api/photos/import', requireAuth, upload.array('photos', 100), async (req, res) => {
    try {
        const files = req.files;
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const file of files) {
            try {
                await photoManager.importPhoto(file.path);
                imported++;
                // Clean up temp file
                await fs.unlink(file.path);
            } catch (error) {
                console.error('Error importing file:', error);
                errors++;
            }
        }

        res.json({ success: true, imported, skipped, errors, total: files.length });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.delete('/api/photos/:photoId', requireAuth, async (req, res) => {
    try {
        await photoManager.deletePhoto(parseInt(req.params.photoId));
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('==========================================');
    console.log('   Open Frame - Web Version Started!');
    console.log('==========================================');
    console.log('');
    console.log(`   Open your browser and visit:`);
    console.log(`   http://localhost:${PORT}`);
    console.log('');
    console.log('   Press Ctrl+C to stop the server');
    console.log('==========================================');
    console.log('');
});
