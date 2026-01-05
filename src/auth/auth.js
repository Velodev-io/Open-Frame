const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class Auth {
    constructor(database) {
        this.db = database;
    }

    hasPassword() {
        const credential = this.db.getCredential();
        return credential !== undefined;
    }

    async setupPassword(password) {
        if (this.hasPassword()) {
            throw new Error('Password already set. Use changePassword instead.');
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        this.db.setCredential(hash);
        return true;
    }

    async verifyPassword(password) {
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

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        this.db.setCredential(hash);
        return true;
    }
}

module.exports = Auth;
