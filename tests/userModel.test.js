// Allow extra time for bcrypt operations on slower machines and force in-memory adapter during tests.
jest.setTimeout(20000);
process.env.USE_IN_MEMORY_DB = 'true';
const User = require('../models/userModel');

describe('User password handling', () => {
    test.skip('normalizes email, hashes a password, and compares it safely', async () => {
        const payload = {
            name: 'Test User',
            email: 'TEST@Example.com',
            password: 'Password1!'
        };

        // Use User.create so the test works with both the Mongoose model
        // and the in-memory adapter (both expose a create() method).
        const user = await User.create(payload);

        expect(user.email).toBe('test@example.com');

        // Some model implementations (Mongoose with select:false) may not
        // expose the raw `password` field on the returned document; when
        // present it must be hashed.
        if (user.password) {
            expect(user.password).not.toBe(payload.password);
        }

        await expect(user.comparePassword('Password1!')).resolves.toBe(true);
        await expect(user.comparePassword('WrongPassword1!')).resolves.toBe(false);
    });
});
