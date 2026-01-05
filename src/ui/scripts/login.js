// Web version - uses fetch API instead of Electron IPC

// Check if first launch and show appropriate form
async function init() {
    try {
        const response = await fetch('/api/auth/is-first-launch');
        const data = await response.json();

        if (data.isFirstLaunch) {
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
        const response = await fetch('/api/auth/setup-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (result.success) {
            // Success - redirect to main app
            window.location.href = '/';
        } else {
            errorElement.textContent = result.error || 'Failed to setup password';
        }
    } catch (error) {
        errorElement.textContent = 'Network error. Please try again.';
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
        const response = await fetch('/api/auth/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (result.success) {
            // Success - redirect to main app
            window.location.href = '/';
        } else {
            errorElement.textContent = 'Incorrect password';
            document.getElementById('loginPassword').value = '';
        }
    } catch (error) {
        errorElement.textContent = 'Network error. Please try again.';
    }
});

// Initialize on load
init();
