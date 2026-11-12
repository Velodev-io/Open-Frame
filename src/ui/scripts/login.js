// Dual-mode login script (supports both Electron IPC and Web fetch API)

const isElectron = typeof window.electronAPI !== 'undefined';

// Check if first launch and show appropriate form
async function init() {
    try {
        let isFirstLaunch = false;

        if (isElectron) {
            isFirstLaunch = await window.electronAPI.isFirstLaunch();
        } else {
            const response = await fetch('/api/auth/is-first-launch');
            const data = await response.json();
            isFirstLaunch = data.isFirstLaunch;
        }

        if (isFirstLaunch) {
            document.getElementById('setupForm').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';
        } else {
            document.getElementById('setupForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking first launch:', error);
    }
}

// Setup form handler
document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('setupPassword').value;
    const passwordConfirm = document.getElementById('setupPasswordConfirm').value;
    const errorElement = document.getElementById('setupError');

    errorElement.textContent = '';

    // Validate passwords match
    if (password !== passwordConfirm) {
        errorElement.textContent = 'Passwords do not match';
        return;
    }

    // Validate password length
    if (password.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        return;
    }

    // Setup password
    try {
        let result;
        if (isElectron) {
            result = await window.electronAPI.setupPassword(password);
        } else {
            const response = await fetch('/api/auth/setup-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            result = await response.json();
        }

        if (result.success) {
            if (isElectron) {
                window.electronAPI.loginSuccess();
            } else {
                window.location.href = '/';
            }
        } else {
            errorElement.textContent = result.error || 'Failed to setup password';
        }
    } catch (error) {
        errorElement.textContent = 'Error setting up password. Please try again.';
    }
});

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');

    errorElement.textContent = '';

    // Verify password
    try {
        let result;
        if (isElectron) {
            result = await window.electronAPI.verifyPassword(password);
        } else {
            const response = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            result = await response.json();
        }

        if (result.success) {
            if (isElectron) {
                window.electronAPI.loginSuccess();
            } else {
                window.location.href = '/';
            }
        } else {
            errorElement.textContent = result.error || 'Incorrect password';
            document.getElementById('loginPassword').value = '';
        }
    } catch (error) {
        errorElement.textContent = 'Error verifying password. Please try again.';
    }
});

// Initialize on load
init();
