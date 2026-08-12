// Allow extra time for bcrypt operations on slower machines.
jest.setTimeout(20000);

// Force in-memory adapter during tests (no real MongoDB required).
process.env.USE_IN_MEMORY_DB = 'true';

const User = require('../models/userModel');

describe('User model – in-memory adapter', () => {
    test('creates a user with hashed password and returns comparePassword', async () => {
        const payload = {
            name: 'Test User',
            email: 'TEST@Example.com',
            password: 'Password1!'
        };

        const user = await User.create(payload);

        // Email should be normalized to lowercase
        expect(user.email).toBe('test@example.com');

        // Password must be hashed (bcrypt hash starts with $2)
        expect(user.password).toMatch(/^\$2/);
        expect(user.password).not.toBe(payload.password);

        // comparePassword must work correctly
        await expect(user.comparePassword('Password1!')).resolves.toBe(true);
        await expect(user.comparePassword('WrongPassword!')).resolves.toBe(false);
    });

    test('creates a user with extended fields', async () => {
        const payload = {
            name: 'Jane Doe',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            password: 'Password1!',
            phoneNumber: '01012345678',
            age: 25,
            gender: 'female'
        };

        const user = await User.create(payload);

        expect(user.firstName).toBe('Jane');
        expect(user.lastName).toBe('Doe');
        expect(user.phoneNumber).toBe('01012345678');
        expect(user.age).toBe(25);
        expect(user.gender).toBe('female');
    });

    test('defaults confirmEmail to false', async () => {
        const user = await User.create({
            name: 'Unverified',
            email: 'unverified@example.com',
            password: 'Password1!'
        });

        expect(user.confirmEmail).toBe(false);
    });

    test('defaults role to "user" and statusAccount to "active"', async () => {
        const user = await User.create({
            name: 'Default Role',
            email: 'default@example.com',
            password: 'Password1!'
        });

        expect(user.role).toBe('user');
        expect(user.statusAccount).toBe('active');
    });

    test('defaults passwordVersion to 0', async () => {
        const user = await User.create({
            name: 'Version Check',
            email: 'version@example.com',
            password: 'Password1!'
        });

        expect(user.passwordVersion).toBe(0);
    });
});
