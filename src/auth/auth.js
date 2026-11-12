const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

class Auth {
    constructor(database) {
        this.db = database;
    }

    hasPassword() {
        const credential = this.db.getCredential();
        return credential !== undefined;
    }

    validatePassword(password) {
        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
    }

    async setupPassword(password) {
        if (this.hasPassword()) {
            throw new Error('Password already set. Use changePassword instead.');
        }

        this.validatePassword(password);

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        this.db.setCredential(hash);
        return true;
    }

    async verifyPassword(password) {
        if (typeof password !== 'string' || !password) {
            return false;
        }

        const credential = this.db.getCredential();
        if (!credential) {
            throw new Error('No password set. Setup required.');
        }

        return await bcrypt.compare(password, credential.password_hash);
    }

    async changePassword(oldPassword, newPassword) {
        const isValid = await this.verifyPassword(oldPassword);
        if (!isValid) {
            throw new Error('Current password is incorrect.');
        }

        this.validatePassword(newPassword);

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        this.db.setCredential(hash);
        return true;
    }
}

module.exports = Auth;
